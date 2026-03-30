import {
  createTrack,
  type TimelineClip,
  type TimelineClipThumbnail,
  type TimelineTrack,
  type TimelineTrackHeaderRenderArgs,
} from '@minijay/timeline';

export const BASE_DURATION = 30;

export const createWaveform = (seed: number, size = 24) =>
  Array.from({ length: size }, (_, index) => {
    const value = Math.abs(Math.sin(seed * 0.8 + index * 0.45));
    return Number(value.toFixed(2));
  });

const createVideoPoster = (label: string, accent: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#g)" />
      <circle cx="246" cy="48" r="26" fill="rgba(255,255,255,0.14)" />
      <path d="M132 64 L196 90 L132 116 Z" fill="#f8fafc" opacity="0.88" />
      <text x="24" y="144" fill="#f8fafc" font-family="Segoe UI, sans-serif" font-size="24" font-weight="700">${label}</text>
    </svg>
  `);

export const videoPoster = createVideoPoster('Scene A', '#2563eb');
export const sceneAThumbnails: TimelineClipThumbnail[] = [
  { time: 0, url: createVideoPoster('Intro', '#2563eb') },
  { time: 0.8, url: createVideoPoster('Bridge', '#0f766e') },
  { time: 1.6, url: createVideoPoster('Close Up', '#db2777') },
  { time: 2.4, url: createVideoPoster('Outro', '#ea580c') },
];
export const overlayThumbnails: TimelineClipThumbnail[] = [
  { time: 0, url: createVideoPoster('Overlay', '#7c3aed') },
  { time: 0.7, url: createVideoPoster('Title', '#be185d') },
  { time: 1.4, url: createVideoPoster('CTA', '#0891b2') },
];

export const initialTracks: TimelineTrack[] = [];

export const trackHeader = ({
  track,
  defaultContent,
}: TimelineTrackHeaderRenderArgs) => (
  <div className="example-trackHeader">
    <div className="example-trackMeta">
      <strong>{track.category ?? 'Track'}</strong>
      <span>{track.name}</span>
    </div>
    <div className="example-trackControls">{defaultContent}</div>
  </div>
);

export const getClipEnd = (clip: TimelineClip) =>
  clip.timelineStart + Math.max(0, clip.timelineDuration);

export const getTrackTailTime = (clips: TimelineClip[], trackId: string) =>
  clips
    .filter((clip) => clip.trackId === trackId)
    .reduce((maxTime, clip) => Math.max(maxTime, getClipEnd(clip)), 0);
