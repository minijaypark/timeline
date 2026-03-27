import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './TimelineEditor.css';
import type {
  TimelineClip,
  TimelineEditorProps,
  TimelineRegion,
} from './types';
import { useControllableState } from './useControllableState';
import {
  clamp,
  clipLeftPx,
  clipTimelineEnd,
  clipTimelineStart,
  clipVisibleDuration,
  clipWidthPx,
  formatTime,
  formatTimelineLabel,
  getGridInterval,
  getLabelInterval,
  getSoloTrackIds,
  groupClipsByTrack,
  isClipActiveAtTime,
  isTrackAudible,
  regionWidth,
  setExclusiveSolo,
  snapTime,
  updateClipList,
  updateTrackList,
} from './utils';

type InteractionState =
  | {
      type: 'move';
      clipId: string;
      originClip: TimelineClip;
      originTrackId: string;
      startClientX: number;
      startClientY: number;
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
      rulerRect: DOMRect;
    };

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
  const [viewportWidth, setViewportWidth] = useState(0);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const tracksPanelRef = useRef<HTMLDivElement>(null);

  const pxPerSec = resolvedZoom * basePxPerSec;
  const gridSize = getGridInterval(pxPerSec);
  const labelInterval = getLabelInterval(pxPerSec);
  const effectiveDuration = Math.max(totalDuration, 0.001);
  const contentWidth = Math.max(
    effectiveDuration * pxPerSec,
    Math.max(0, viewportWidth - leftColumnWidth),
  );
  const visibleTrackCount = tracks.length + (video ? 1 : 0);
  const canvasWidth = leftColumnWidth + contentWidth;
  const clipsByTrack = useMemo(() => groupClipsByTrack(clips), [clips]);
  const soloTrackIds = useMemo(() => getSoloTrackIds(tracks), [tracks]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setViewportWidth(element.clientWidth);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (interaction.type === 'region') {
        const px = clamp(
          event.clientX - interaction.rulerRect.left,
          0,
          interaction.rulerRect.width,
        );
        const time = clamp(px / pxPerSec, 0, totalDuration);
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
        onClipsChange(
          updateClipList(clips, interaction.clipId, {
            start: clamp(nextStart, 0, interaction.originClip.end - 0.05),
          }),
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
        onClipsChange(
          updateClipList(clips, interaction.clipId, {
            end: clamp(
              nextEnd,
              interaction.originClip.start + 0.05,
              interaction.originClip.duration,
            ),
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
      const nextStartOffset = snapTime(
        Math.max(
          interaction.originClip.startOffset + deltaX,
          -interaction.originClip.start,
        ),
        gridSize,
        snapToGrid,
      );

      onClipsChange(
        updateClipList(clips, interaction.clipId, {
          startOffset: nextStartOffset,
          trackId: nextTrackId,
        }),
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

  const handleRulerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const time = clamp(
      (event.clientX - rect.left + target.scrollLeft) / pxPerSec,
      0,
      totalDuration,
    );
    onSeek?.(time);
    setInteraction({
      type: 'region',
      startTime: time,
      rulerRect: rect,
    });
    setResolvedRegion({ start: time, end: time });
  };

  const regionLeft = resolvedRegion ? resolvedRegion.start * pxPerSec : 0;
  const regionPxWidth = resolvedRegion
    ? regionWidth(resolvedRegion, pxPerSec)
    : 0;

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
      <div className="tl-toolbar">
        <div className="tl-toolbarGroup">
          <button className="tl-button" onClick={onPlay} disabled={!onPlay}>
            Play
          </button>
          <button className="tl-button" onClick={onPause} disabled={!onPause}>
            Pause
          </button>
          <button className="tl-button" onClick={onStop} disabled={!onStop}>
            Stop
          </button>
        </div>
        <div className="tl-toolbarGroup">
          <span className="tl-timeValue">{formatTime(currentTime)}</span>
          <span className="tl-timeValue">/ {formatTime(totalDuration)}</span>
        </div>
        <div className="tl-toolbarSpacer" />
        <div className="tl-toolbarGroup">
          <span className="tl-zoomValue">
            {(resolvedZoom * 100).toFixed(0)}%
          </span>
          <input
            className="tl-zoomInput"
            type="range"
            min={minZoom}
            max={maxZoom}
            step={zoomStep}
            value={resolvedZoom}
            onChange={(event) =>
              setResolvedZoom(Number.parseFloat(event.target.value))
            }
          />
        </div>
      </div>

      <div className="tl-viewport" ref={viewportRef}>
        <div className="tl-canvas" style={{ width: canvasWidth }}>
          <div className="tl-corner" />

          <div className="tl-ruler">
            <div
              className="tl-rulerInner"
              style={{ width: contentWidth }}
              onPointerDown={handleRulerPointerDown}
            >
              {rulerTicks.map((tick) => (
                <div
                  key={tick.left}
                  className="tl-rulerTick"
                  data-strong={tick.strong}
                  style={{ left: tick.left }}
                >
                  {tick.label}
                </div>
              ))}
            </div>
          </div>

          <div className="tl-trackHeaders">
            {video ? <div className="tl-videoHeader">{video.name}</div> : null}
            {tracks.map((track) => (
              <div key={track.id} className="tl-trackHeader">
                <div className="tl-trackName">{track.name}</div>
                <input
                  className="tl-trackVolume"
                  type="range"
                  min={0}
                  max={2}
                  step={0.01}
                  value={track.volume ?? 1}
                  onChange={(event) =>
                    handleTrackVolume(
                      track.id,
                      Number.parseFloat(event.target.value),
                    )
                  }
                  disabled={!onTracksChange}
                />
                <div className="tl-trackActions">
                  <button
                    className="tl-trackToggle"
                    data-active={track.isSolo === true}
                    onPointerDown={(event) => handleTrackSolo(event, track.id)}
                    type="button"
                  >
                    S
                  </button>
                  <button
                    className="tl-trackToggle"
                    data-active={track.isMuted === true}
                    onClick={() => handleTrackMute(track.id)}
                    type="button"
                  >
                    M
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="tl-tracksPanel" ref={tracksPanelRef}>
            <div className="tl-tracksContent" style={{ width: contentWidth }}>
              {rulerTicks.map((tick) => (
                <div
                  key={`grid-${tick.left}`}
                  className="tl-gridLine"
                  data-strong={tick.strong}
                  style={{ left: tick.left }}
                />
              ))}

              {resolvedRegion ? (
                <div
                  className="tl-region"
                  style={{ left: regionLeft, width: regionPxWidth }}
                />
              ) : null}

              {video ? <div className="tl-trackRow" /> : null}

              {tracks.map((track) => {
                const rowClips = clipsByTrack.get(track.id) ?? [];
                const disabled = !isTrackAudible(track, soloTrackIds);

                return (
                  <div
                    key={track.id}
                    className="tl-trackRow"
                    data-disabled={disabled}
                  >
                    {rowClips.map((clip) => {
                      const selected = resolvedSelection.includes(clip.id);
                      const active =
                        isPlaying &&
                        !disabled &&
                        isClipActiveAtTime(clip, currentTime);
                      const width = clipWidthPx(clip, pxPerSec);
                      const left = clipLeftPx(clip, pxPerSec);
                      const visibleDuration = clipVisibleDuration(clip);
                      const fadeInWidth = Math.min(
                        width,
                        Math.max(0, (clip.fade?.in?.duration ?? 0) * pxPerSec),
                      );
                      const fadeOutWidth = Math.min(
                        width,
                        Math.max(0, (clip.fade?.out?.duration ?? 0) * pxPerSec),
                      );

                      const defaultContent = (
                        <div className="tl-clipBody">
                          <span className="tl-clipLabel">{clip.name}</span>
                          <span className="tl-clipMeta">
                            {visibleDuration.toFixed(2)}s
                          </span>
                        </div>
                      );

                      return (
                        <div
                          key={clip.id}
                          className="tl-clip"
                          data-selected={selected}
                          data-active={active}
                          style={
                            {
                              left,
                              width,
                              ['--clip-color' as string]: clip.color,
                              opacity: disabled ? 0.48 : 1,
                            } as CSSProperties
                          }
                          onPointerDown={(event) => {
                            handleSelectClip(event, clip.id);
                            if (!onClipsChange) {
                              return;
                            }
                            event.preventDefault();
                            setInteraction({
                              type: 'move',
                              clipId: clip.id,
                              originClip: clip,
                              originTrackId: track.id,
                              startClientX: event.clientX,
                              startClientY: event.clientY,
                            });
                          }}
                        >
                          {fadeInWidth > 0 ? (
                            <div
                              className="tl-fadeIn"
                              style={{ width: fadeInWidth }}
                            />
                          ) : null}
                          {fadeOutWidth > 0 ? (
                            <div
                              className="tl-fadeOut"
                              style={{
                                width: fadeOutWidth,
                                left: width - fadeOutWidth,
                              }}
                            />
                          ) : null}
                          {renderClip
                            ? renderClip({
                                clip,
                                isSelected: selected,
                                isActive: active,
                                defaultContent,
                              })
                            : defaultContent}
                          <div
                            className="tl-clipHandle"
                            data-side="left"
                            onPointerDown={(event) => {
                              if (!onClipsChange) {
                                return;
                              }
                              event.stopPropagation();
                              setInteraction({
                                type: 'resize-left',
                                clipId: clip.id,
                                originClip: clip,
                                startClientX: event.clientX,
                              });
                            }}
                          />
                          <div
                            className="tl-clipHandle"
                            data-side="right"
                            onPointerDown={(event) => {
                              if (!onClipsChange) {
                                return;
                              }
                              event.stopPropagation();
                              setInteraction({
                                type: 'resize-right',
                                clipId: clip.id,
                                originClip: clip,
                                startClientX: event.clientX,
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div className="tl-playheadLayer">
                <div
                  className="tl-playhead"
                  style={{ left: clamp(currentTime, 0, totalDuration) * pxPerSec }}
                >
                  <div className="tl-playheadHead" />
                  <div className="tl-playheadLine" />
                </div>
              </div>

              {tracks.length === 0 ? (
                <div className="tl-empty">No tracks available</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
