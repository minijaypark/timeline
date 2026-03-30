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
  clipTimelineEnd,
  clipTimelineStart,
  getTimeFromPointerEvent,
  getClipFillMode,
  getClipPlaybackRate,
  getClipSourceDuration,
  getClipSourceEnd,
  getClipSourceStart,
  getClipTimelineDuration,
  snapTime,
  updateClipList,
} from './utils';

const MIN_SOURCE_DURATION = 0.05;
const MIN_TIMELINE_DURATION = 0.05;

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
      type: 'fade-in' | 'fade-out';
      clipId: string;
      originClip: TimelineClip;
      startClientX: number;
    }
  | {
      type: 'region';
      startTime: number;
      rulerElement: HTMLDivElement;
    };

export const useInteractions = ({
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
        const clip = interaction.originClip;
        const timelineStart = clipTimelineStart(clip);
        const timelineEnd = clipTimelineEnd(clip);
        const sourceStart = getClipSourceStart(clip);
        const sourceEnd = getClipSourceEnd(clip);
        const playbackRate = getClipPlaybackRate(clip);
        const fillMode = getClipFillMode(clip);
        const minTimelineStart =
          fillMode === 'trim'
            ? Math.max(0, timelineStart - sourceStart / playbackRate)
            : 0;
        const nextTimelineStart = snapTime(
          clamp(
            timelineStart + deltaX,
            minTimelineStart,
            timelineEnd - MIN_TIMELINE_DURATION,
          ),
          gridSize,
          snapToGrid,
        );
        const nextTimelineDuration = Math.max(
          MIN_TIMELINE_DURATION,
          timelineEnd - nextTimelineStart,
        );
        const nextSourceStart =
          fillMode === 'trim'
            ? clamp(
                sourceStart +
                  (nextTimelineStart - timelineStart) * playbackRate,
                0,
                sourceEnd - MIN_SOURCE_DURATION,
              )
            : sourceStart;
        const nextClip =
          behavior?.resizeClip?.({
            clip,
            clips,
            edge: 'left',
            nextTimelineStart,
            nextTimelineDuration,
            nextSourceStart,
            nextStart: nextSourceStart,
            gridSize,
            pxPerSec,
            snapToGrid,
          }) ?? {
            timelineStart: nextTimelineStart,
            timelineDuration: nextTimelineDuration,
            sourceStart: nextSourceStart,
          };
        if (!nextClip) {
          return;
        }
        onClipsChange(updateClipList(clips, interaction.clipId, nextClip));
        return;
      }

      if (interaction.type === 'resize-right') {
        const clip = interaction.originClip;
        const timelineStart = clipTimelineStart(clip);
        const timelineDuration = getClipTimelineDuration(clip);
        const sourceStart = getClipSourceStart(clip);
        const sourceEnd = getClipSourceEnd(clip);
        const sourceDuration = getClipSourceDuration(clip);
        const playbackRate = getClipPlaybackRate(clip);
        const fillMode = getClipFillMode(clip);
        const nextTimelineDuration =
          fillMode === 'trim'
            ? clamp(
                timelineDuration + deltaX,
                MIN_TIMELINE_DURATION,
                (sourceDuration - sourceStart) / playbackRate,
              )
            : snapTime(
                clamp(
                  timelineDuration + deltaX,
                  MIN_TIMELINE_DURATION,
                  Math.max(MIN_TIMELINE_DURATION, totalDuration - timelineStart),
                ),
                gridSize,
                snapToGrid,
              );
        const nextSourceEnd =
          fillMode === 'trim'
            ? clamp(
                sourceStart + nextTimelineDuration * playbackRate,
                sourceStart + MIN_SOURCE_DURATION,
                sourceDuration,
              )
            : sourceEnd;
        const nextClip =
          behavior?.resizeClip?.({
            clip,
            clips,
            edge: 'right',
            nextTimelineStart: timelineStart,
            nextTimelineDuration,
            nextSourceEnd,
            nextEnd: nextSourceEnd,
            gridSize,
            pxPerSec,
            snapToGrid,
          }) ?? {
            timelineDuration: nextTimelineDuration,
            sourceEnd: nextSourceEnd,
          };
        if (!nextClip) {
          return;
        }
        onClipsChange(updateClipList(clips, interaction.clipId, nextClip));
        return;
      }

      if (interaction.type === 'fade-in' || interaction.type === 'fade-out') {
        const clip = interaction.originClip;
        const timelineDuration = getClipTimelineDuration(clip);
        const originFadeIn = clip.fade?.in?.duration ?? 0;
        const originFadeOut = clip.fade?.out?.duration ?? 0;
        const otherFadeDuration =
          interaction.type === 'fade-in' ? originFadeOut : originFadeIn;
        const maxFadeDuration = Math.max(
          0,
          timelineDuration - otherFadeDuration - MIN_TIMELINE_DURATION,
        );
        const originDuration =
          interaction.type === 'fade-in' ? originFadeIn : originFadeOut;
        const nextDuration = clamp(
          interaction.type === 'fade-in'
            ? originDuration + deltaX
            : originDuration - deltaX,
          0,
          maxFadeDuration,
        );
        const nextFade = {
          in:
            interaction.type === 'fade-in'
              ? nextDuration > 0
                ? { duration: nextDuration }
                : undefined
              : clip.fade?.in,
          out:
            interaction.type === 'fade-out'
              ? nextDuration > 0
                ? { duration: nextDuration }
                : undefined
              : clip.fade?.out,
        };

        onClipsChange(
          updateClipList(clips, interaction.clipId, {
            fade: nextFade.in || nextFade.out ? nextFade : undefined,
          }),
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
      const nextTimelineStart = snapTime(
        Math.max(clipTimelineStart(interaction.originClip) + deltaX, 0),
        gridSize,
        snapToGrid,
      );
      const nextStartOffset =
        nextTimelineStart - getClipSourceStart(interaction.originClip);
      const nextPlacement =
        behavior?.moveClip?.({
          clip: interaction.originClip,
          clips,
          tracks,
          nextTrackId,
          nextTimelineStart,
          nextStartOffset,
          gridSize,
          pxPerSec,
          snapToGrid,
        }) ?? {
          timelineStart: nextTimelineStart,
          trackId: nextTrackId,
        };
      if (!nextPlacement) {
        return;
      }

      onClipsChange(updateClipList(clips, interaction.clipId, nextPlacement));
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
    startClipFade: ({
      clip,
      edge,
      event,
    }: {
      clip: TimelineClip;
      edge: 'fade-in' | 'fade-out';
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
