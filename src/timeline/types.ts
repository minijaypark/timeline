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
  fade?: {
    in?: {
      duration: number;
    };
    out?: {
      duration: number;
    };
  };
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
  nextStartOffset: number;
  gridSize: number;
  pxPerSec: number;
  snapToGrid: boolean;
}

export interface TimelineClipResizeArgs {
  clip: TimelineClip;
  clips: TimelineClip[];
  edge: 'left' | 'right';
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
  ) => { trackId: string; startOffset: number } | null;
  resizeClip?: (
    args: TimelineClipResizeArgs,
  ) => { start?: number; end?: number } | null;
}

export interface TimelineEditorProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  totalDuration: number;
  isPlaying?: boolean;
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
  snapToGrid?: boolean;
  behavior?: TimelineEditorBehavior;
  renderClip?: (args: TimelineClipRenderArgs) => ReactNode;
  renderTrackHeader?: (args: TimelineTrackHeaderRenderArgs) => ReactNode;
  onTracksChange?: (tracks: TimelineTrack[]) => void;
  onClipsChange?: (clips: TimelineClip[]) => void;
  onSeek?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

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
  partial: Pick<
    TimelineClip,
    'id' | 'trackId' | 'name' | 'startOffset' | 'start' | 'end' | 'duration'
  > &
    Partial<TimelineClip>,
): TimelineClip => ({
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
  startOffset: partial.startOffset,
  duration: partial.duration,
  start: partial.start,
  end: partial.end,
  updatedAt: partial.updatedAt,
  parentId: partial.parentId,
  candidates: partial.candidates,
  primaryFileId: partial.primaryFileId,
  placeholderType: partial.placeholderType,
  placeholderLabel: partial.placeholderLabel,
  placeholderLength: partial.placeholderLength,
  fade: partial.fade,
});

export const createVideoInfo = (
  partial: Pick<TimelineVideoInfo, 'id' | 'name'> & Partial<TimelineVideoInfo>,
): TimelineVideoInfo => ({
  id: partial.id,
  name: partial.name,
  duration: partial.duration,
});

const randomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 65% 58%)`;
};
