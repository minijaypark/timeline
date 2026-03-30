import type { CSSProperties, ReactNode } from 'react';

export const CLIP_TYPE = {
  CREATED: 'created',
  UPLOADED: 'uploaded',
  SOUNDLAYER_PARENT: 'soundlayer-parent',
  SOUNDLAYER_CHILD: 'soundlayer-child',
  MUSIC: 'music',
  PLACEHOLDER: 'placeholder',
} as const;

export type TimelineClipType = (typeof CLIP_TYPE)[keyof typeof CLIP_TYPE];
export type TimelineClipMediaKind = 'audio' | 'video';
export type TimelineClipFillMode =
  | 'trim'
  | 'loop'
  | 'stretch'
  | 'placeholder';

export interface TimelineTrack {
  id: string;
  name: string;
  category?: string;
  isMuted?: boolean;
  isSolo?: boolean;
  volume?: number;
  clips?: string[];
}

export interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  type: TimelineClipType;
  fileId?: string;
  originalUrl?: string;
  cachedUrl?: string;
  color: string;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  timelineStart: number;
  timelineDuration: number;
  sourceDuration: number;
  sourceStart: number;
  sourceEnd: number;
  playbackRate: number;
  fillMode: TimelineClipFillMode;
  startOffset: number;
  duration: number;
  start: number;
  end: number;
  updatedAt?: Date | string;
  parentId?: string;
  candidates?: string[];
  primaryFileId?: string;
  placeholderType?: 'draft' | 'loading' | 'error' | 'recording' | 'merging';
  placeholderLabel?: string;
  placeholderLength?: number;
  mediaKind?: TimelineClipMediaKind;
  waveform?: number[];
  posterUrl?: string;
  thumbnails?: TimelineClipThumbnail[];
  fade?: {
    in?: {
      duration: number;
    };
    out?: {
      duration: number;
    };
  };
}

export interface TimelineClipThumbnail {
  url: string;
  time: number;
}

export interface TimelineVideoInfo {
  id: string;
  name: string;
  duration?: number;
}

export interface TimelineRegion {
  start: number;
  end: number;
}

export interface TimelineClipRenderArgs {
  clip: TimelineClip;
  isSelected: boolean;
  isActive: boolean;
  defaultContent: ReactNode;
}

export interface TimelineClipContentRenderArgs {
  clip: TimelineClip;
  isSelected: boolean;
  isActive: boolean;
  visibleDuration: number;
  visibleWidth: number;
  visibleLeft: number;
  fullWidth: number;
  defaultContent: ReactNode;
}

export interface TimelineTrackHeaderRenderArgs {
  track: TimelineTrack;
  isReadOnly: boolean;
  defaultContent: ReactNode;
}

export interface TimelineClipSelectionArgs {
  clipId: string;
  selectedClipIds: string[];
  metaKey: boolean;
  ctrlKey: boolean;
}

export interface TimelineClipMoveArgs {
  clip: TimelineClip;
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  nextTrackId: string;
  nextTimelineStart: number;
  nextStartOffset: number;
  gridSize: number;
  pxPerSec: number;
  snapToGrid: boolean;
}

export interface TimelineClipResizeArgs {
  clip: TimelineClip;
  clips: TimelineClip[];
  edge: 'left' | 'right';
  nextTimelineStart?: number;
  nextTimelineDuration?: number;
  nextSourceStart?: number;
  nextSourceEnd?: number;
  nextStart?: number;
  nextEnd?: number;
  gridSize: number;
  pxPerSec: number;
  snapToGrid: boolean;
}

export interface TimelineEditorBehavior {
  selectClips?: (args: TimelineClipSelectionArgs) => string[];
  moveClip?: (
    args: TimelineClipMoveArgs,
  ) => { trackId: string; timelineStart?: number; startOffset?: number } | null;
  resizeClip?: (
    args: TimelineClipResizeArgs,
  ) => {
    timelineStart?: number;
    timelineDuration?: number;
    sourceStart?: number;
    sourceEnd?: number;
    start?: number;
    end?: number;
  } | null;
}

export interface TimelineEditorProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  totalDuration: number;
  isPlaying?: boolean;
  loop?: boolean;
  isLoading?: boolean;
  video?: TimelineVideoInfo | null;
  className?: string;
  style?: CSSProperties;
  height?: number | string;
  leftColumnWidth?: number;
  rowHeight?: number;
  basePxPerSec?: number;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  zoomStep?: number;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  selectedClipIds?: string[];
  onSelectedClipIdsChange?: (clipIds: string[]) => void;
  region?: TimelineRegion | null;
  onRegionChange?: (region: TimelineRegion | null) => void;
  loadingFallback?: ReactNode;
  emptyState?: ReactNode;
  enableShortcuts?: boolean;
  snapToGrid?: boolean;
  behavior?: TimelineEditorBehavior;
  renderClipContent?: (args: TimelineClipContentRenderArgs) => ReactNode;
  renderClip?: (args: TimelineClipRenderArgs) => ReactNode;
  renderTrackHeader?: (args: TimelineTrackHeaderRenderArgs) => ReactNode;
  onTracksChange?: (tracks: TimelineTrack[]) => void;
  onClipsChange?: (clips: TimelineClip[]) => void;
  onSeek?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onLoopChange?: (loop: boolean) => void;
}

export interface TimelinePreviewProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  isPlaying?: boolean;
  className?: string;
  style?: CSSProperties;
  aspectRatio?: number | string;
  emptyState?: ReactNode;
}

type TimelineClipLegacyTimingInput = {
  startOffset: number;
  duration: number;
  start: number;
  end: number;
};

type TimelineClipExplicitTimingInput = {
  timelineStart: number;
  sourceDuration: number;
  sourceStart?: number;
  sourceEnd?: number;
  timelineDuration?: number;
  playbackRate?: number;
  fillMode?: TimelineClipFillMode;
};

type TimelineClipTimingInput =
  | TimelineClipLegacyTimingInput
  | TimelineClipExplicitTimingInput
  | (TimelineClipLegacyTimingInput & TimelineClipExplicitTimingInput);

export const createTrack = (
  partial: Pick<TimelineTrack, 'id' | 'name'> & Partial<TimelineTrack>,
): TimelineTrack => ({
  id: partial.id,
  name: partial.name,
  category: partial.category,
  isMuted: partial.isMuted ?? false,
  isSolo: partial.isSolo ?? false,
  volume: partial.volume ?? 1,
  clips: partial.clips ?? [],
});

export const createClip = (
  partial: Pick<TimelineClip, 'id' | 'trackId' | 'name'> &
    Partial<TimelineClip> &
    TimelineClipTimingInput,
): TimelineClip => {
  const playbackRate = partial.playbackRate ?? 1;
  const fillMode = partial.fillMode ?? defaultFillMode(partial);
  const sourceDuration =
    partial.sourceDuration ?? partial.duration ?? partial.sourceEnd ?? partial.end ?? 0;
  const sourceStart = partial.sourceStart ?? partial.start ?? 0;
  const sourceEnd =
    partial.sourceEnd ?? partial.end ?? sourceDuration;
  const trimmedDuration = Math.max(0, sourceEnd - sourceStart);
  const defaultTimelineDuration = trimmedDuration / playbackRate;
  const timelineDuration =
    partial.timelineDuration ?? defaultTimelineDuration;
  const timelineStart =
    partial.timelineStart ?? (partial.startOffset ?? 0) + sourceStart;

  return {
    id: partial.id,
    trackId: partial.trackId,
    name: partial.name,
    type: partial.type ?? CLIP_TYPE.CREATED,
    fileId: partial.fileId,
    originalUrl: partial.originalUrl,
    cachedUrl: partial.cachedUrl,
    color: partial.color ?? randomColor(),
    volume: partial.volume ?? 1,
    isMuted: partial.isMuted ?? false,
    isPlaying: partial.isPlaying ?? true,
    timelineStart,
    timelineDuration,
    sourceDuration,
    sourceStart,
    sourceEnd,
    playbackRate,
    fillMode,
    startOffset: timelineStart - sourceStart,
    duration: sourceDuration,
    start: sourceStart,
    end: sourceEnd,
    updatedAt: partial.updatedAt,
    parentId: partial.parentId,
    candidates: partial.candidates,
    primaryFileId: partial.primaryFileId,
    placeholderType: partial.placeholderType,
    placeholderLabel: partial.placeholderLabel,
    placeholderLength: partial.placeholderLength,
    mediaKind: partial.mediaKind ?? 'audio',
    waveform: partial.waveform,
    posterUrl: partial.posterUrl,
    thumbnails: partial.thumbnails,
    fade: partial.fade,
  };
};

export const createVideoInfo = (
  partial: Pick<TimelineVideoInfo, 'id' | 'name'> & Partial<TimelineVideoInfo>,
): TimelineVideoInfo => ({
  id: partial.id,
  name: partial.name,
  duration: partial.duration,
});

const defaultFillMode = (clip: Partial<TimelineClip>) => {
  if (clip.placeholderType) {
    return 'placeholder';
  }
  return 'trim';
};

const randomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 65% 58%)`;
};
