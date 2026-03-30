import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { TimelineClip } from './types';
import type { TimelinePreviewProps } from './types';
import { useMediaPlayback } from './useMediaPlayback';
import {
  getActiveVideoClips,
  getClipPlaybackPosition,
  getClipSourceUrl,
  getElementPlaybackRate,
} from './utils';

const syncPreviewVideo = ({
  clip,
  currentTime,
  element,
  isPlaying,
}: {
  clip: TimelineClip;
  currentTime: number;
  element: HTMLVideoElement;
  isPlaying: boolean;
}) => {
  const nextTime = getClipPlaybackPosition(clip, currentTime);
  if (nextTime === null) {
    if (!element.paused) {
      element.pause();
    }
    return;
  }

  element.defaultMuted = true;
  element.muted = true;
  element.playbackRate = getElementPlaybackRate(clip);

  const drift = Math.abs(element.currentTime - nextTime);
  if (!isPlaying || drift > 0.18) {
    element.currentTime = nextTime;
  }

  if (!isPlaying) {
    if (!element.paused) {
      element.pause();
    }
    return;
  }

  if (element.paused) {
    void element.play().catch(() => {
      // Ignore autoplay errors from browser autoplay policies.
    });
  }
};

const getStillFrameUrl = (clip: TimelineClip, currentTime: number) => {
  if (clip.thumbnails && clip.thumbnails.length > 0) {
    const playbackPosition =
      getClipPlaybackPosition(clip, currentTime) ?? clip.sourceStart;

    return clip.thumbnails.reduce((closest, candidate) => {
      if (!closest) {
        return candidate;
      }

      const closestDiff = Math.abs(closest.time - playbackPosition);
      const candidateDiff = Math.abs(candidate.time - playbackPosition);
      return candidateDiff < closestDiff ? candidate : closest;
    }, clip.thumbnails[0])?.url;
  }

  return clip.posterUrl;
};

export const Preview = ({
  tracks,
  clips,
  currentTime,
  isPlaying = false,
  className,
  style,
  aspectRatio = '16 / 9',
  emptyState,
}: TimelinePreviewProps) => {
  const visibleVideoClips = useMemo(
    () =>
      getActiveVideoClips({ clips, tracks, currentTime }).filter(
        (clip) =>
          Boolean(getClipSourceUrl(clip)) ||
          Boolean(clip.posterUrl) ||
          Boolean(clip.thumbnails?.length),
      ),
    [clips, currentTime, tracks],
  );
  const playableClips = useMemo(
    () => clips.filter((clip) => Boolean(getClipSourceUrl(clip))),
    [clips],
  );
  const trackNames = useMemo(
    () => new Map(tracks.map((track) => [track.id, track.name])),
    [tracks],
  );
  const visibleVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const { registerMediaElement } = useMediaPlayback({
    clips: playableClips,
    currentTime,
    isPlaying,
    tracks,
  });

  useEffect(() => {
    const activeClipIds = new Set(visibleVideoClips.map((clip) => clip.id));

    for (const clipId of Object.keys(visibleVideoRefs.current)) {
      if (activeClipIds.has(clipId)) {
        continue;
      }
      delete visibleVideoRefs.current[clipId];
    }

    for (const clip of visibleVideoClips) {
      const sourceUrl = getClipSourceUrl(clip);
      if (!sourceUrl) {
        continue;
      }

      const element = visibleVideoRefs.current[clip.id];
      if (!element) {
        continue;
      }

      syncPreviewVideo({
        clip,
        currentTime,
        element,
        isPlaying,
      });
    }
  }, [currentTime, isPlaying, visibleVideoClips]);

  const topmostClip = visibleVideoClips.at(-1) ?? null;
  const previewClassName = ['tl-preview', className].filter(Boolean).join(' ');

  return (
    <section
      className={previewClassName}
      style={
        {
          ...style,
          ['--tl-preview-aspect-ratio' as string]:
            typeof aspectRatio === 'number' ? `${aspectRatio}` : aspectRatio,
        } as CSSProperties
      }
    >
      <div className="tl-previewStage">
        {visibleVideoClips.length === 0 ? (
          <div className="tl-previewEmpty">
            {emptyState ?? <span>No active video at the current playhead.</span>}
          </div>
        ) : (
          <>
            {visibleVideoClips.map((clip, index) => {
              const sourceUrl = getClipSourceUrl(clip);
              const frameUrl = getStillFrameUrl(clip, currentTime);

              return (
                <div
                  key={clip.id}
                  className="tl-previewLayer"
                  style={{ zIndex: index + 1 }}
                >
                  {sourceUrl ? (
                    <video
                      ref={(element) => {
                        visibleVideoRefs.current[clip.id] = element;
                      }}
                      className="tl-previewVideo"
                      muted
                      playsInline
                      poster={frameUrl}
                      preload="auto"
                      src={sourceUrl}
                    />
                  ) : frameUrl ? (
                    <img
                      alt=""
                      className="tl-previewImage"
                      draggable={false}
                      src={frameUrl}
                    />
                  ) : null}
                </div>
              );
            })}

            <div className="tl-previewOverlay">
              {topmostClip ? (
                <div className="tl-previewPrimary">
                  <strong>{topmostClip.name}</strong>
                  <span>{trackNames.get(topmostClip.trackId) ?? topmostClip.trackId}</span>
                </div>
              ) : null}

              {visibleVideoClips.length > 1 ? (
                <div className="tl-previewStack" aria-label="Active video layers">
                  {visibleVideoClips
                    .slice()
                    .reverse()
                    .map((clip, index) => (
                      <span
                        key={`${clip.id}-stack`}
                        className="tl-previewBadge"
                        data-top={index === 0}
                      >
                        {trackNames.get(clip.trackId) ?? clip.trackId}
                      </span>
                    ))}
                </div>
              ) : null}
            </div>
          </>
        )}

        <div className="tl-previewMediaPool" aria-hidden="true">
          {playableClips.map((clip) => {
            const sourceUrl = getClipSourceUrl(clip);
            if (!sourceUrl) {
              return null;
            }

            if (clip.mediaKind === 'video') {
              return (
                <video
                  key={`${clip.id}-transport`}
                  playsInline
                  preload="auto"
                  ref={(element) => registerMediaElement(clip.id, element)}
                  src={sourceUrl}
                />
              );
            }

            return (
              <audio
                key={`${clip.id}-transport`}
                preload="auto"
                ref={(element) => registerMediaElement(clip.id, element)}
                src={sourceUrl}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};
