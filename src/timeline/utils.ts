import type { PointerEvent as ReactPointerEvent } from 'react';
import { createClip } from './types';
import type {
  TimelineClip,
  TimelineClipFillMode,
  TimelineRegion,
  TimelineTrack,
} from './types';

export const MIN_CLIP_WIDTH_PX = 18;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const snapTime = (value: number, gridSize: number, enabled: boolean) => {
  if (!enabled || gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
};

export const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

export const formatTimelineLabel = (seconds: number) => formatTime(seconds);

export const getGridInterval = (pxPerSec: number) => {
  if (pxPerSec >= 100) return 0.25;
  if (pxPerSec >= 50) return 0.5;
  if (pxPerSec >= 25) return 1;
  if (pxPerSec >= 10) return 2;
  if (pxPerSec >= 5) return 5;
  if (pxPerSec >= 2) return 10;
  if (pxPerSec >= 1) return 30;
  return 60;
};

export const getLabelInterval = (pxPerSec: number) => {
  if (pxPerSec >= 100) return 1;
  if (pxPerSec >= 50) return 2;
  if (pxPerSec >= 25) return 5;
  if (pxPerSec >= 10) return 10;
  if (pxPerSec >= 5) return 30;
  return 60;
};

export const getClipFillMode = (clip: TimelineClip): TimelineClipFillMode =>
  clip.fillMode ?? (clip.placeholderType ? 'placeholder' : 'trim');

export const getClipSourceUrl = (clip: TimelineClip) =>
  clip.cachedUrl ?? clip.originalUrl ?? null;

export const getClipPlaybackRate = (clip: TimelineClip) =>
  clip.playbackRate > 0 ? clip.playbackRate : 1;

export const getClipSourceDuration = (clip: TimelineClip) =>
  clip.sourceDuration ?? clip.duration;

export const getClipSourceStart = (clip: TimelineClip) =>
  clip.sourceStart ?? clip.start;

export const getClipSourceEnd = (clip: TimelineClip) =>
  clip.sourceEnd ?? clip.end;

export const getClipTrimmedSourceDuration = (clip: TimelineClip) =>
  Math.max(0, getClipSourceEnd(clip) - getClipSourceStart(clip));

export const getClipTimelineDuration = (clip: TimelineClip) => {
  if (clip.timelineDuration > 0) {
    return clip.timelineDuration;
  }
  return getClipTrimmedSourceDuration(clip) / getClipPlaybackRate(clip);
};

export const getClipPlaybackPosition = (
  clip: TimelineClip,
  currentTime: number,
) => {
  const timelineOffset = currentTime - clipTimelineStart(clip);
  const timelineDuration = getClipTimelineDuration(clip);
  const sourceStart = getClipSourceStart(clip);
  const sourceEnd = getClipSourceEnd(clip);
  const trimmedDuration = getClipTrimmedSourceDuration(clip);

  if (timelineOffset < 0 || timelineOffset > timelineDuration) {
    return null;
  }

  if (trimmedDuration <= 0) {
    return sourceStart;
  }

  if (clip.fillMode === 'loop') {
    const loopOffset = (timelineOffset * getClipPlaybackRate(clip)) % trimmedDuration;
    return sourceStart + loopOffset;
  }

  if (clip.fillMode === 'stretch') {
    const ratio = timelineDuration <= 0 ? 0 : timelineOffset / timelineDuration;
    return sourceStart + ratio * trimmedDuration;
  }

  return clamp(
    sourceStart + timelineOffset * getClipPlaybackRate(clip),
    sourceStart,
    sourceEnd,
  );
};

export const getElementPlaybackRate = (clip: TimelineClip) => {
  if (clip.fillMode !== 'stretch') {
    return getClipPlaybackRate(clip);
  }

  const timelineDuration = Math.max(getClipTimelineDuration(clip), 0.01);
  return getClipTrimmedSourceDuration(clip) / timelineDuration;
};

export const clipTimelineStart = (clip: TimelineClip) =>
  clip.timelineStart ?? clip.startOffset + clip.start;

export const clipVisibleDuration = (clip: TimelineClip) =>
  Math.max(0, getClipTimelineDuration(clip));

export const clipVisualStart = (clip: TimelineClip) => {
  if (getClipFillMode(clip) !== 'trim') {
    return clipTimelineStart(clip);
  }

  return clipTimelineStart(clip) - getClipSourceStart(clip) / getClipPlaybackRate(clip);
};

export const clipVisualDuration = (clip: TimelineClip) => {
  if (getClipFillMode(clip) !== 'trim') {
    return clipVisibleDuration(clip);
  }

  return Math.max(0, getClipSourceDuration(clip) / getClipPlaybackRate(clip));
};

export const clipVisibleOffset = (clip: TimelineClip) => {
  if (getClipFillMode(clip) !== 'trim') {
    return 0;
  }

  return Math.max(0, getClipSourceStart(clip) / getClipPlaybackRate(clip));
};

export const clipTimelineEnd = (clip: TimelineClip) =>
  clipTimelineStart(clip) + clipVisibleDuration(clip);

export const clipWidthPx = (clip: TimelineClip, pxPerSec: number) =>
  Math.max(MIN_CLIP_WIDTH_PX, clipVisibleDuration(clip) * pxPerSec);

export const clipVisualWidthPx = (clip: TimelineClip, pxPerSec: number) =>
  Math.max(MIN_CLIP_WIDTH_PX, clipVisualDuration(clip) * pxPerSec);

export const clipLeftPx = (clip: TimelineClip, pxPerSec: number) =>
  clipTimelineStart(clip) * pxPerSec;

export const clipVisualLeftPx = (clip: TimelineClip, pxPerSec: number) =>
  clipVisualStart(clip) * pxPerSec;

export const clipVisibleOffsetPx = (clip: TimelineClip, pxPerSec: number) =>
  clipVisibleOffset(clip) * pxPerSec;

export const groupClipsByTrack = (clips: TimelineClip[]) => {
  const map = new Map<string, TimelineClip[]>();
  for (const clip of clips) {
    const current = map.get(clip.trackId);
    if (current) {
      current.push(clip);
    } else {
      map.set(clip.trackId, [clip]);
    }
  }
  for (const entry of map.values()) {
    entry.sort((a, b) => clipTimelineStart(a) - clipTimelineStart(b));
  }
  return map;
};

export const updateTrackList = (
  tracks: TimelineTrack[],
  trackId: string,
  updates: Partial<TimelineTrack>,
) =>
  tracks.map((track) =>
    track.id === trackId ? { ...track, ...updates } : track,
  );

export const updateClipList = (
  clips: TimelineClip[],
  clipId: string,
  updates: Partial<TimelineClip>,
) =>
  clips.map((clip) =>
    clip.id === clipId
      ? normalizeClip({
          ...clip,
          ...translateLegacyClipUpdates(clip, updates),
          updatedAt: new Date(),
        })
      : clip,
  );

const translateLegacyClipUpdates = (
  clip: TimelineClip,
  updates: Partial<TimelineClip>,
) => {
  const nextUpdates = { ...updates };
  const hasLegacyStart =
    updates.start !== undefined || updates.sourceStart !== undefined;
  const hasLegacyEnd = updates.end !== undefined || updates.sourceEnd !== undefined;
  const hasLegacyOffset = updates.startOffset !== undefined;
  const nextPlaybackRate =
    updates.playbackRate !== undefined && updates.playbackRate > 0
      ? updates.playbackRate
      : getClipPlaybackRate(clip);
  const nextSourceStart = updates.sourceStart ?? updates.start ?? getClipSourceStart(clip);
  const nextSourceEnd = updates.sourceEnd ?? updates.end ?? getClipSourceEnd(clip);
  const nextStartOffset = updates.startOffset ?? clip.startOffset;

  if (updates.start !== undefined && updates.sourceStart === undefined) {
    nextUpdates.sourceStart = updates.start;
  }

  if (updates.end !== undefined && updates.sourceEnd === undefined) {
    nextUpdates.sourceEnd = updates.end;
  }

  if (
    updates.timelineStart === undefined &&
    (hasLegacyStart || hasLegacyOffset)
  ) {
    nextUpdates.timelineStart = nextStartOffset + nextSourceStart;
  }

  if (
    updates.timelineDuration === undefined &&
    (hasLegacyStart || hasLegacyEnd)
  ) {
    nextUpdates.timelineDuration = Math.max(0, nextSourceEnd - nextSourceStart) / nextPlaybackRate;
  }

  return nextUpdates;
};

export const normalizeClip = (clip: TimelineClip): TimelineClip =>
  createClip({
    ...clip,
    timelineStart: clip.timelineStart ?? clip.startOffset + clip.start,
    timelineDuration:
      clip.timelineDuration ??
      Math.max(0, clip.end - clip.start) / getClipPlaybackRate(clip),
    sourceDuration: clip.sourceDuration ?? clip.duration,
    sourceStart: clip.sourceStart ?? clip.start,
    sourceEnd: clip.sourceEnd ?? clip.end,
    playbackRate: getClipPlaybackRate(clip),
    fillMode: getClipFillMode(clip),
  });

export const setExclusiveSolo = (tracks: TimelineTrack[], trackId: string) => {
  const target = tracks.find((track) => track.id === trackId);
  const nextValue =
    !(target?.isSolo ?? false) ||
    tracks.some((track) => track.id !== trackId && track.isSolo);

  return tracks.map((track) => ({
    ...track,
    isSolo: track.id === trackId ? nextValue : false,
  }));
};

export const getSoloTrackIds = (tracks: TimelineTrack[]) =>
  tracks.filter((track) => track.isSolo).map((track) => track.id);

export const isTrackAudible = (track: TimelineTrack, soloTrackIds: string[]) => {
  if (track.isMuted) {
    return false;
  }
  if (soloTrackIds.length === 0) {
    return true;
  }
  return soloTrackIds.includes(track.id);
};

export const isClipActiveAtTime = (clip: TimelineClip, currentTime: number) =>
  currentTime >= clipTimelineStart(clip) && currentTime <= clipTimelineEnd(clip);

const getTrackOrder = (trackId: string, tracks: TimelineTrack[]) => {
  const index = tracks.findIndex((track) => track.id === trackId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export const compareVisualLayerOrder = (
  left: TimelineClip,
  right: TimelineClip,
  tracks: TimelineTrack[],
) => {
  const trackOrderDiff =
    getTrackOrder(right.trackId, tracks) - getTrackOrder(left.trackId, tracks);

  if (trackOrderDiff !== 0) {
    return trackOrderDiff;
  }

  const timelineStartDiff = clipTimelineStart(left) - clipTimelineStart(right);
  if (timelineStartDiff !== 0) {
    return timelineStartDiff;
  }

  const updatedAtDiff =
    new Date(left.updatedAt ?? 0).getTime() - new Date(right.updatedAt ?? 0).getTime();

  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  return left.id.localeCompare(right.id);
};

export const getActiveVideoClips = ({
  clips,
  tracks,
  currentTime,
}: {
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  currentTime: number;
}) =>
  clips
    .filter(
      (clip) => clip.mediaKind === 'video' && isClipActiveAtTime(clip, currentTime),
    )
    .sort((left, right) => compareVisualLayerOrder(left, right, tracks));

export const regionWidth = (region: TimelineRegion, pxPerSec: number) =>
  Math.max(0, region.end - region.start) * pxPerSec;

export const getTimeFromPointerEvent = (
  event: PointerEvent | ReactPointerEvent<HTMLElement>,
  element: HTMLElement,
  pxPerSec: number,
  totalDuration: number,
) => {
  const rect = element.getBoundingClientRect();
  const raw = (event.clientX - rect.left + element.scrollLeft) / pxPerSec;
  return clamp(raw, 0, totalDuration);
};
