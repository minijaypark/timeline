import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import type {
  TimelineClip,
  TimelineClipRenderArgs,
  TimelineRegion,
  TimelineTrack,
} from '../types';
import { AudioWaveform } from './AudioWaveform';
import { VideoThumbnailStrip } from './VideoThumbnailStrip';
import {
  clamp,
  clipLeftPx,
  clipVisibleDuration,
  clipWidthPx,
  MIN_CLIP_WIDTH_PX,
  isClipActiveAtTime,
  isTrackAudible,
} from '../utils';

const renderDefaultClipContent = (
  clip: TimelineClip,
  visibleDuration: number,
  width: number,
) => {
  return (
    <div className="tl-clipBody" data-media-kind={clip.mediaKind}>
      {clip.mediaKind === 'video' ? (
        <VideoThumbnailStrip clip={clip} width={width} />
      ) : null}
      <div className="tl-clipInfo">
        <div className="tl-clipHeader">
          <span className="tl-clipLabel">{clip.name}</span>
          <div className="tl-clipMetaGroup">
            {clip.mediaKind === 'video' ? (
              <span className="tl-clipBadge">Video</span>
            ) : null}
            <span className="tl-clipMeta">{visibleDuration.toFixed(2)}s</span>
          </div>
        </div>
        {clip.mediaKind === 'audio' ? <AudioWaveform clip={clip} width={width} /> : null}
      </div>
    </div>
  );
};

export const TrackRows = ({
  clipsByTrack,
  contentWidth,
  currentTime,
  isPlaying,
  onClipFadePointerDown,
  onClipPointerDown,
  onClipResizePointerDown,
  pxPerSec,
  region,
  renderClip,
  selectedClipIds,
  soloTrackIds,
  ticks,
  totalDuration,
  tracks,
  tracksPanelRef,
  videoRow,
}: {
  clipsByTrack: Map<string, TimelineClip[]>;
  contentWidth: number;
  currentTime: number;
  isPlaying: boolean;
  onClipFadePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    clip: TimelineClip,
    edge: 'fade-in' | 'fade-out',
  ) => void;
  onClipPointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    trackId: string,
    clip: TimelineClip,
  ) => void;
  onClipResizePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    clip: TimelineClip,
    edge: 'resize-left' | 'resize-right',
  ) => void;
  pxPerSec: number;
  region: TimelineRegion | null;
  renderClip?: (args: TimelineClipRenderArgs) => ReactNode;
  selectedClipIds: string[];
  soloTrackIds: string[];
  ticks: Array<{ left: number; label?: string; strong: boolean }>;
  totalDuration: number;
  tracks: TimelineTrack[];
  tracksPanelRef: RefObject<HTMLDivElement | null>;
  videoRow: boolean;
}) => {
  const regionLeft = region ? region.start * pxPerSec : 0;
  const regionWidth = region ? Math.max(0, region.end - region.start) * pxPerSec : 0;

  return (
    <div className="tl-tracksPanel" ref={tracksPanelRef}>
      <div className="tl-tracksContent" style={{ width: contentWidth }}>
        {ticks.map((tick) => (
          <div
            key={`grid-${tick.left}`}
            className="tl-gridLine"
            data-strong={tick.strong}
            style={{ left: tick.left }}
          />
        ))}

        {region ? (
          <div
            className="tl-region"
            style={{ left: regionLeft, width: regionWidth }}
          />
        ) : null}

        {videoRow ? <div className="tl-trackRow" /> : null}

        {tracks.map((track) => {
          const rowClips = clipsByTrack.get(track.id) ?? [];
          const disabled = !isTrackAudible(track, soloTrackIds);

          return (
            <div key={track.id} className="tl-trackRow" data-disabled={disabled}>
              {rowClips.map((clip) => {
                const selected = selectedClipIds.includes(clip.id);
                const active =
                  isPlaying && !disabled && isClipActiveAtTime(clip, currentTime);
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
                const fadeHandleInset = Math.max(8, Math.min(width / 2, 12));
                const fadeInHandleLeft = clamp(
                  fadeInWidth,
                  fadeHandleInset,
                  Math.max(fadeHandleInset, width - fadeHandleInset),
                );
                const fadeOutHandleLeft = clamp(
                  width - fadeOutWidth,
                  fadeHandleInset,
                  Math.max(fadeHandleInset, width - fadeHandleInset),
                );
                const defaultContent = renderDefaultClipContent(
                  clip,
                  visibleDuration,
                  width,
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
                        ['--clip-min-width' as string]: `${MIN_CLIP_WIDTH_PX}px`,
                        opacity: disabled ? 0.48 : 1,
                      } as CSSProperties
                    }
                    onPointerDown={(event) => onClipPointerDown(event, track.id, clip)}
                  >
                    {fadeInWidth > 0 ? (
                      <div className="tl-fadeIn" style={{ width: fadeInWidth }} />
                    ) : null}
                    <div
                      className="tl-fadeHandle"
                      data-side="in"
                      style={{ left: fadeInHandleLeft }}
                      onPointerDown={(event) =>
                        onClipFadePointerDown(event, clip, 'fade-in')
                      }
                    />
                    {fadeOutWidth > 0 ? (
                      <div
                        className="tl-fadeOut"
                        style={{
                          width: fadeOutWidth,
                          left: width - fadeOutWidth,
                        }}
                      />
                    ) : null}
                    <div
                      className="tl-fadeHandle"
                      data-side="out"
                      style={{ left: fadeOutHandleLeft }}
                      onPointerDown={(event) =>
                        onClipFadePointerDown(event, clip, 'fade-out')
                      }
                    />
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
                      onPointerDown={(event) =>
                        onClipResizePointerDown(event, clip, 'resize-left')
                      }
                    />
                    <div
                      className="tl-clipHandle"
                      data-side="right"
                      onPointerDown={(event) =>
                        onClipResizePointerDown(event, clip, 'resize-right')
                      }
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
  );
};
