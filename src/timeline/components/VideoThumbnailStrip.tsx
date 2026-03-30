import type { TimelineClip, TimelineClipThumbnail } from '../types';
import { clamp, getClipFillMode } from '../utils';

const DEFAULT_THUMBNAIL_WIDTH_PX = 56;
const MIN_THUMBNAIL_WIDTH_PX = 36;

const buildPosterFrames = (posterUrl: string, width: number) => {
  const count = Math.max(1, Math.ceil(width / DEFAULT_THUMBNAIL_WIDTH_PX));
  const frameWidth = width / count;

  return Array.from({ length: count }, (_, index) => {
    const left = index * frameWidth;
    const nextLeft = index === count - 1 ? width : (index + 1) * frameWidth;

    return {
      key: `${posterUrl}-${index}`,
      url: posterUrl,
      left,
      width: Math.max(1, nextLeft - left),
    };
  });
};

const buildTimestampFrames = (
  thumbnails: TimelineClipThumbnail[],
  clip: TimelineClip,
  width: number,
  renderFullSource: boolean,
) => {
  const sourceStart = renderFullSource ? 0 : clip.sourceStart;
  const sourceEnd = renderFullSource
    ? Math.max(sourceStart, clip.sourceDuration)
    : Math.max(sourceStart, clip.sourceEnd);
  const sourceSpan = Math.max(0.001, sourceEnd - sourceStart);
  const visibleThumbnails = thumbnails
    .filter((thumbnail) => thumbnail.time >= sourceStart && thumbnail.time <= sourceEnd)
    .sort((left, right) => left.time - right.time);

  if (visibleThumbnails.length === 0) {
    return [];
  }

  return visibleThumbnails.map((thumbnail, index) => {
    const left =
      index === 0
        ? 0
        : clamp(((thumbnail.time - sourceStart) / sourceSpan) * width, 0, width);
    const next = visibleThumbnails[index + 1];
    const nextLeft = next
      ? clamp(((next.time - sourceStart) / sourceSpan) * width, left, width)
      : width;

    return {
      key: `${thumbnail.url}-${thumbnail.time}`,
      url: thumbnail.url,
      left,
      width: Math.min(width - left, Math.max(MIN_THUMBNAIL_WIDTH_PX, nextLeft - left)),
    };
  });
};

const getFrames = (clip: TimelineClip, width: number) => {
  const renderFullSource = getClipFillMode(clip) === 'trim';

  if (width <= 0) {
    return [];
  }

  if (clip.thumbnails && clip.thumbnails.length > 0) {
    const frames = buildTimestampFrames(
      clip.thumbnails,
      clip,
      width,
      renderFullSource,
    );
    if (frames.length > 0) {
      return frames;
    }
  }

  if (clip.posterUrl) {
    return buildPosterFrames(clip.posterUrl, width);
  }

  return [];
};

export const VideoThumbnailStrip = ({
  clip,
  fullWidth,
  viewportOffset = 0,
}: {
  clip: TimelineClip;
  fullWidth: number;
  viewportOffset?: number;
}) => {
  const frames = getFrames(clip, fullWidth);

  if (frames.length === 0) {
    return null;
  }

  return (
    <div
      className="tl-videoStrip"
      aria-hidden="true"
      style={{
        left: -viewportOffset,
        width: fullWidth,
      }}
    >
      {frames.map((frame) => (
        <div
          key={frame.key}
          className="tl-videoFrame"
          style={{ left: frame.left, width: frame.width }}
        >
          <img alt="" draggable={false} src={frame.url} />
        </div>
      ))}
    </div>
  );
};
