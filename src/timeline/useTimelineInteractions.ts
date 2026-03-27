import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  TimelineClip,
  TimelineEditorBehavior,
  TimelineRegion,
  TimelineTrack,
} from './types';
import {
  clamp,
  getTimeFromPointerEvent,
  snapTime,
  updateClipList,
} from './utils';

type TimelineInteractionState =
  | {
      type: 'move';
      clipId: string;
      originClip: TimelineClip;
      originTrackId: string;
      startClientX: number;
    }
  | {
      type: 'resize-left' | 'resize-right';
      clipId: string;
      originClip: TimelineClip;
      startClientX: number;
    }
  | {
      type: 'region';
      startTime: number;
      rulerElement: HTMLDivElement;
    };

export const useTimelineInteractions = ({
  behavior,
  clips,
  gridSize,
  onClipsChange,
  onSeek,
  pxPerSec,
  resolvedRegion,
  rowHeight,
  setResolvedRegion,
  snapToGrid,
  totalDuration,
  tracks,
}: {
  behavior?: TimelineEditorBehavior;
  clips: TimelineClip[];
  gridSize: number;
  onClipsChange?: (clips: TimelineClip[]) => void;
  onSeek?: (time: number) => void;
  pxPerSec: number;
  resolvedRegion: TimelineRegion | null;
  rowHeight: number;
  setResolvedRegion: (region: TimelineRegion | null) => void;
  snapToGrid: boolean;
  totalDuration: number;
  tracks: TimelineTrack[];
}) => {
  const [interaction, setInteraction] = useState<TimelineInteractionState | null>(
    null,
  );
  const tracksPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (interaction.type === 'region') {
        const time = getTimeFromPointerEvent(
          event,
          interaction.rulerElement,
          pxPerSec,
          totalDuration,
        );
        setResolvedRegion({
          start: Math.min(interaction.startTime, time),
          end: Math.max(interaction.startTime, time),
        });
        return;
      }

      if (!onClipsChange) {
        return;
      }

      const deltaX = (event.clientX - interaction.startClientX) / pxPerSec;

      if (interaction.type === 'resize-left') {
        const nextStart = snapTime(
          clamp(
            interaction.originClip.start + deltaX,
            0,
            interaction.originClip.end - 0.05,
          ),
          gridSize,
          snapToGrid,
        );
        const nextClip =
          behavior?.resizeClip?.({
            clip: interaction.originClip,
            clips,
            edge: 'left',
            nextStart: clamp(nextStart, 0, interaction.originClip.end - 0.05),
            gridSize,
            pxPerSec,
            snapToGrid,
          }) ?? {
            start: clamp(nextStart, 0, interaction.originClip.end - 0.05),
          };
        if (!nextClip) {
          return;
        }
        onClipsChange(
          updateClipList(clips, interaction.clipId, nextClip),
        );
        return;
      }

      if (interaction.type === 'resize-right') {
        const nextEnd = snapTime(
          clamp(
            interaction.originClip.end + deltaX,
            interaction.originClip.start + 0.05,
            interaction.originClip.duration,
          ),
          gridSize,
          snapToGrid,
        );
        const nextClip =
          behavior?.resizeClip?.({
            clip: interaction.originClip,
            clips,
            edge: 'right',
            nextEnd: clamp(
              nextEnd,
              interaction.originClip.start + 0.05,
              interaction.originClip.duration,
            ),
            gridSize,
            pxPerSec,
            snapToGrid,
          }) ?? {
            end: clamp(
              nextEnd,
              interaction.originClip.start + 0.05,
              interaction.originClip.duration,
            ),
          };
        if (!nextClip) {
          return;
        }
        onClipsChange(
          updateClipList(clips, interaction.clipId, nextClip),
        );
        return;
      }

      if (!tracksPanelRef.current) {
        return;
      }

      if (interaction.type !== 'move') {
        return;
      }

      const panelRect = tracksPanelRef.current.getBoundingClientRect();
      const rowIndex = clamp(
        Math.floor((event.clientY - panelRect.top) / rowHeight),
        0,
        Math.max(tracks.length - 1, 0),
      );
      const nextTrackId = tracks[rowIndex]?.id ?? interaction.originTrackId;
      const nextStartOffset = snapTime(
        Math.max(
          interaction.originClip.startOffset + deltaX,
          -interaction.originClip.start,
        ),
        gridSize,
        snapToGrid,
      );
      const nextPlacement =
        behavior?.moveClip?.({
          clip: interaction.originClip,
          clips,
          tracks,
          nextTrackId,
          nextStartOffset,
          gridSize,
          pxPerSec,
          snapToGrid,
        }) ?? {
          startOffset: nextStartOffset,
          trackId: nextTrackId,
        };
      if (!nextPlacement) {
        return;
      }

      onClipsChange(
        updateClipList(clips, interaction.clipId, nextPlacement),
      );
    };

    const handlePointerUp = () => {
      if (
        interaction.type === 'region' &&
        resolvedRegion &&
        Math.abs(resolvedRegion.end - resolvedRegion.start) < 0.01
      ) {
        setResolvedRegion(null);
      }

      setInteraction(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    behavior,
    clips,
    gridSize,
    interaction,
    onClipsChange,
    pxPerSec,
    resolvedRegion,
    rowHeight,
    setResolvedRegion,
    snapToGrid,
    totalDuration,
    tracks,
  ]);

  const handleRulerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const time = getTimeFromPointerEvent(
      event,
      event.currentTarget,
      pxPerSec,
      totalDuration,
    );
    onSeek?.(time);
    setInteraction({
      type: 'region',
      startTime: time,
      rulerElement: event.currentTarget,
    });
    setResolvedRegion({ start: time, end: time });
  };

  return {
    tracksPanelRef,
    handleRulerPointerDown,
    startClipMove: ({
      clip,
      trackId,
      event,
    }: {
      clip: TimelineClip;
      trackId: string;
      event: ReactPointerEvent<HTMLDivElement>;
    }) => {
      setInteraction({
        type: 'move',
        clipId: clip.id,
        originClip: clip,
        originTrackId: trackId,
        startClientX: event.clientX,
      });
    },
    startClipResize: ({
      clip,
      edge,
      event,
    }: {
      clip: TimelineClip;
      edge: 'resize-left' | 'resize-right';
      event: ReactPointerEvent<HTMLDivElement>;
    }) => {
      setInteraction({
        type: edge,
        clipId: clip.id,
        originClip: clip,
        startClientX: event.clientX,
      });
    },
  };
};
