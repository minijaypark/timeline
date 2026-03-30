import type { TimelineClipThumbnail } from './types';

const DEFAULT_THUMBNAIL_WIDTH_PX = 160;
const THUMBNAIL_PX_INTERVAL = 70;
const INITIAL_THUMBNAIL_INTERVAL_SEC = 5;
const MIN_THUMBNAIL_INTERVAL_SEC = 0.25;
const VIDEO_LOAD_TIMEOUT_MS = 30_000;

type ThumbnailCacheEntry = {
  duration: number;
  interval: number;
  thumbnails: TimelineClipThumbnail[];
};

const thumbnailMetadataCache = new Map<
  string,
  Map<number, Map<number, ThumbnailCacheEntry>>
>();
const ongoingGenerations = new Map<string, Promise<ThumbnailCacheEntry>>();

const roundTime = (value: number) => Number(value.toFixed(3));

const getGenerationKey = (
  sourceUrl: string,
  interval: number,
  thumbnailWidth: number,
) => JSON.stringify([sourceUrl, interval, thumbnailWidth]);

const getThumbnailWidthBucket = (
  sourceUrl: string,
  thumbnailWidth: number,
) => thumbnailMetadataCache.get(sourceUrl)?.get(thumbnailWidth) ?? null;

const setCachedThumbnailEntry = (
  sourceUrl: string,
  thumbnailWidth: number,
  interval: number,
  entry: ThumbnailCacheEntry,
) => {
  let widthBucket = thumbnailMetadataCache.get(sourceUrl);

  if (!widthBucket) {
    widthBucket = new Map();
    thumbnailMetadataCache.set(sourceUrl, widthBucket);
  }

  let intervalBucket = widthBucket.get(thumbnailWidth);
  if (!intervalBucket) {
    intervalBucket = new Map();
    widthBucket.set(thumbnailWidth, intervalBucket);
  }

  intervalBucket.set(interval, entry);
};

const loadVideoElement = (sourceUrl: string) =>
  new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('video thumbnail generation timed out'));
    }, VIDEO_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };

    const handleLoadedData = () => {
      cleanup();
      resolve(video);
    };

    const handleError = () => {
      cleanup();
      reject(new Error('video thumbnail generation failed to load source'));
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.src = sourceUrl;
  });

const seekVideo = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }

    const handleSeeked = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error('video thumbnail generation failed to seek'));
    };
    const cleanup = () => {
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };

    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    video.currentTime = time;
  });

const captureThumbnail = async (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  time: number,
  thumbnailWidth: number,
) => {
  await seekVideo(video, time);

  const safeWidth = Math.max(video.videoWidth, 1);
  const safeHeight = Math.max(video.videoHeight, 1);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('video thumbnail generation failed to get canvas context');
  }

  canvas.width = thumbnailWidth;
  canvas.height = Math.max(
    1,
    Math.round((safeHeight / safeWidth) * thumbnailWidth),
  );
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
};

const buildThumbnailTimestamps = (duration: number, interval: number) => {
  const safeDuration = Math.max(duration, 0);
  const maxTimestamp = roundTime(Math.max(safeDuration - 0.05, 0));

  if (!Number.isFinite(safeDuration) || safeDuration <= 0) {
    return [0];
  }

  const timestamps: number[] = [];

  for (let time = 0; time < maxTimestamp; time += interval) {
    timestamps.push(roundTime(time));
  }

  if (
    timestamps.length === 0 ||
    Math.abs(timestamps[timestamps.length - 1] - maxTimestamp) > 0.01
  ) {
    timestamps.push(maxTimestamp);
  }

  return timestamps;
};

export const calculateThumbnailInterval = (
  displayWidth: number,
  sourceSpan: number,
) => {
  if (displayWidth <= 0 || sourceSpan <= 0) {
    return INITIAL_THUMBNAIL_INTERVAL_SEC;
  }

  const rawInterval = (THUMBNAIL_PX_INTERVAL * sourceSpan) / displayWidth;
  return Math.max(MIN_THUMBNAIL_INTERVAL_SEC, rawInterval);
};

export const filterThumbnailsForInterval = (
  thumbnails: TimelineClipThumbnail[],
  interval: number,
  duration: number,
) => {
  if (thumbnails.length === 0 || interval <= 0) {
    return [];
  }

  const sortedThumbnails = thumbnails
    .slice()
    .sort((left, right) => left.time - right.time);
  const result: TimelineClipThumbnail[] = [];
  const seen = new Set<string>();

  let searchIndex = 0;

  for (let targetTime = 0; targetTime <= duration; targetTime += interval) {
    let closest = sortedThumbnails[searchIndex];
    let minDiff = Math.abs(closest.time - targetTime);

    for (let index = searchIndex + 1; index < sortedThumbnails.length; index += 1) {
      const current = sortedThumbnails[index];
      const diff = Math.abs(current.time - targetTime);

      if (diff < minDiff) {
        minDiff = diff;
        closest = current;
        searchIndex = index;
        continue;
      }

      break;
    }

    const key = `${closest.time}:${closest.url}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(closest);
  }

  const lastThumbnail = sortedThumbnails[sortedThumbnails.length - 1];
  const lastKey = `${lastThumbnail.time}:${lastThumbnail.url}`;

  if (!seen.has(lastKey)) {
    result.push(lastThumbnail);
  }

  return result;
};

export const getCachedThumbnailEntry = (
  sourceUrl: string,
  interval: number,
  thumbnailWidth = DEFAULT_THUMBNAIL_WIDTH_PX,
) => getThumbnailWidthBucket(sourceUrl, thumbnailWidth)?.get(interval) ?? null;

export const getSmallestCachedThumbnailInterval = (
  sourceUrl: string,
  thumbnailWidth = DEFAULT_THUMBNAIL_WIDTH_PX,
) => {
  const intervalBucket = getThumbnailWidthBucket(sourceUrl, thumbnailWidth);

  if (!intervalBucket || intervalBucket.size === 0) {
    return null;
  }

  let smallestInterval: number | null = null;

  for (const interval of intervalBucket.keys()) {
    if (smallestInterval === null || interval < smallestInterval) {
      smallestInterval = interval;
    }
  }

  return smallestInterval;
};

export const getTargetThumbnailInterval = (displayWidth: number, sourceSpan: number) =>
  Math.min(
    INITIAL_THUMBNAIL_INTERVAL_SEC,
    calculateThumbnailInterval(displayWidth, sourceSpan),
  );

export const generateThumbnailEntry = async ({
  sourceUrl,
  interval,
  thumbnailWidth = DEFAULT_THUMBNAIL_WIDTH_PX,
}: {
  sourceUrl: string;
  interval: number;
  thumbnailWidth?: number;
}) => {
  const cached = getCachedThumbnailEntry(sourceUrl, interval, thumbnailWidth);

  if (cached) {
    return cached;
  }

  const generationKey = getGenerationKey(sourceUrl, interval, thumbnailWidth);
  const ongoing = ongoingGenerations.get(generationKey);

  if (ongoing) {
    return ongoing;
  }

  const request = (async () => {
    const video = await loadVideoElement(sourceUrl);
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const canvas = document.createElement('canvas');
    const timestamps = buildThumbnailTimestamps(duration, interval);
    const thumbnails: TimelineClipThumbnail[] = [];

    try {
      for (const time of timestamps) {
        const url = await captureThumbnail(video, canvas, time, thumbnailWidth);
        thumbnails.push({ time, url });
      }
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    const entry = {
      duration,
      interval,
      thumbnails,
    };

    setCachedThumbnailEntry(sourceUrl, thumbnailWidth, interval, entry);
    return entry;
  })();

  ongoingGenerations.set(generationKey, request);

  try {
    return await request;
  } finally {
    ongoingGenerations.delete(generationKey);
  }
};

