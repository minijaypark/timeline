import {
  type PointerEvent as ReactPointerEvent,
  useMemo,
} from 'react';
import './TimelineEditor.css';
import { TimelineRuler } from './components/TimelineRuler';
import { TimelineToolbar } from './components/TimelineToolbar';
import { TimelineTrackHeaders } from './components/TimelineTrackHeaders';
import { TimelineTrackRows } from './components/TimelineTrackRows';
import type { TimelineEditorProps, TimelineRegion } from './types';
import { useControllableState } from './useControllableState';
import { useTimelineInteractions } from './useTimelineInteractions';
import { useTimelineViewport } from './useTimelineViewport';
import {
  formatTimelineLabel,
  getGridInterval,
  getLabelInterval,
  getSoloTrackIds,
  groupClipsByTrack,
  setExclusiveSolo,
  updateTrackList,
} from './utils';

export const TimelineEditor = ({
  tracks,
  clips,
  currentTime,
  totalDuration,
  isPlaying = false,
  video = null,
  className,
  style,
  height = 560,
  leftColumnWidth = 220,
  rowHeight = 72,
  basePxPerSec = 40,
  minZoom = 0.5,
  maxZoom = 8,
  defaultZoom = 1,
  zoomStep = 0.1,
  zoom,
  onZoomChange,
  selectedClipIds,
  onSelectedClipIdsChange,
  region,
  onRegionChange,
  snapToGrid = true,
  renderClip,
  onTracksChange,
  onClipsChange,
  onSeek,
  onPlay,
  onPause,
  onStop,
}: TimelineEditorProps) => {
  const [resolvedZoom, setResolvedZoom] = useControllableState({
    value: zoom,
    defaultValue: defaultZoom,
    onChange: onZoomChange,
  });
  const [resolvedSelection, setResolvedSelection] = useControllableState({
    value: selectedClipIds,
    defaultValue: [] as string[],
    onChange: onSelectedClipIdsChange,
  });
  const [resolvedRegion, setResolvedRegion] = useControllableState({
    value: region,
    defaultValue: null as TimelineRegion | null,
    onChange: onRegionChange,
  });

  const pxPerSec = resolvedZoom * basePxPerSec;
  const gridSize = getGridInterval(pxPerSec);
  const labelInterval = getLabelInterval(pxPerSec);
  const { viewportRef, canvasWidth, contentWidth } = useTimelineViewport({
    leftColumnWidth,
    pxPerSec,
    totalDuration,
  });
  const clipsByTrack = useMemo(() => groupClipsByTrack(clips), [clips]);
  const soloTrackIds = useMemo(() => getSoloTrackIds(tracks), [tracks]);
  const { tracksPanelRef, handleRulerPointerDown, startClipMove, startClipResize } =
    useTimelineInteractions({
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
    });

  const rulerTicks = useMemo(() => {
    const ticks: Array<{ left: number; label?: string; strong: boolean }> = [];
    const seconds = contentWidth / pxPerSec;

    for (let second = 0; second <= seconds; second += gridSize) {
      const rounded = Math.round(second * 1000) / 1000;
      const strong =
        Math.round(rounded * 1000) %
          Math.round(Math.max(labelInterval, gridSize) * 1000) ===
        0;

      ticks.push({
        left: rounded * pxPerSec,
        label: strong ? formatTimelineLabel(rounded) : undefined,
        strong,
      });
    }

    return ticks;
  }, [contentWidth, gridSize, labelInterval, pxPerSec]);

  const handleSelectClip = (
    event: ReactPointerEvent<HTMLDivElement>,
    clipId: string,
  ) => {
    if (event.metaKey || event.ctrlKey) {
      const next = resolvedSelection.includes(clipId)
        ? resolvedSelection.filter((id) => id !== clipId)
        : [...resolvedSelection, clipId];
      setResolvedSelection(next);
      return;
    }

    setResolvedSelection([clipId]);
  };

  const handleTrackMute = (trackId: string) => {
    if (!onTracksChange) {
      return;
    }

    const track = tracks.find((item) => item.id === trackId);
    if (!track) {
      return;
    }

    onTracksChange(
      updateTrackList(tracks, trackId, { isMuted: !track.isMuted }),
    );
  };

  const handleTrackSolo = (
    event: ReactPointerEvent<HTMLButtonElement>,
    trackId: string,
  ) => {
    if (!onTracksChange) {
      return;
    }

    if (event.altKey || event.metaKey) {
      onTracksChange(setExclusiveSolo(tracks, trackId));
      return;
    }

    const track = tracks.find((item) => item.id === trackId);
    if (!track) {
      return;
    }

    onTracksChange(updateTrackList(tracks, trackId, { isSolo: !track.isSolo }));
  };

  const handleTrackVolume = (trackId: string, value: number) => {
    if (!onTracksChange) {
      return;
    }

    onTracksChange(updateTrackList(tracks, trackId, { volume: value }));
  };

  return (
    <div
      className={['tl-editor', className].filter(Boolean).join(' ')}
      style={{
        ...style,
        height,
        ['--tl-left-column-width' as string]: `${leftColumnWidth}px`,
        ['--tl-row-height' as string]: `${rowHeight}px`,
      }}
    >
      <TimelineToolbar
        currentTime={currentTime}
        maxZoom={maxZoom}
        minZoom={minZoom}
        onPause={onPause}
        onPlay={onPlay}
        onStop={onStop}
        onZoomChange={setResolvedZoom}
        totalDuration={totalDuration}
        zoom={resolvedZoom}
        zoomStep={zoomStep}
      />

      <div className="tl-viewport" ref={viewportRef}>
        <div className="tl-canvas" style={{ width: canvasWidth }}>
          <div className="tl-corner" />

          <TimelineRuler
            contentWidth={contentWidth}
            onPointerDown={handleRulerPointerDown}
            ticks={rulerTicks}
          />

          <TimelineTrackHeaders
            onTrackMute={handleTrackMute}
            onTrackSolo={handleTrackSolo}
            onTrackVolume={handleTrackVolume}
            readOnly={!onTracksChange}
            tracks={tracks}
            video={video}
          />

          <TimelineTrackRows
            clipsByTrack={clipsByTrack}
            contentWidth={contentWidth}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onClipPointerDown={(event, trackId, clip) => {
              handleSelectClip(event, clip.id);
              if (!onClipsChange) {
                return;
              }
              event.preventDefault();
              startClipMove({ clip, trackId, event });
            }}
            onClipResizePointerDown={(event, clip, edge) => {
              if (!onClipsChange) {
                return;
              }
              event.stopPropagation();
              startClipResize({ clip, edge, event });
            }}
            pxPerSec={pxPerSec}
            region={resolvedRegion}
            renderClip={renderClip}
            selectedClipIds={resolvedSelection}
            soloTrackIds={soloTrackIds}
            ticks={rulerTicks}
            totalDuration={totalDuration}
            tracks={tracks}
            tracksPanelRef={tracksPanelRef}
            videoRow={video !== null}
          />
        </div>
      </div>
    </div>
  );
};
