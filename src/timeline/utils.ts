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

export const clipTimelineStart = (clip: TimelineClip) =>
  clip.timelineStart ?? clip.startOffset + clip.start;

export const clipVisibleDuration = (clip: TimelineClip) =>
  Math.max(0, getClipTimelineDuration(clip));

export const clipTimelineEnd = (clip: TimelineClip) =>
  clipTimelineStart(clip) + clipVisibleDuration(clip);

export const clipWidthPx = (clip: TimelineClip, pxPerSec: number) =>
  Math.max(MIN_CLIP_WIDTH_PX, clipVisibleDuration(clip) * pxPerSec);

export const clipLeftPx = (clip: TimelineClip, pxPerSec: number) =>
  clipTimelineStart(clip) * pxPerSec;

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
      ? normalizeClip({ ...clip, ...updates, updatedAt: new Date() })
      : clip,
  );

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
