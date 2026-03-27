import { useMemo, useState } from 'react';
import {
  TimelineEditor,
  createClip,
  createTrack,
  type TimelineEditorBehavior,
  type TimelineTrackHeaderRenderArgs,
  useTimelineTransport,
} from '@minijay/timeline';
import '@minijay/timeline/timeline.css';
import './app.css';

const TOTAL_DURATION = 30;

const createWaveform = (seed: number, size = 24) =>
  Array.from({ length: size }, (_, index) => {
    const value = Math.abs(Math.sin(seed * 0.8 + index * 0.45));
    return Number(value.toFixed(2));
  });

const videoPoster =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#g)" />
      <circle cx="246" cy="48" r="26" fill="rgba(255,255,255,0.14)" />
      <path d="M132 64 L196 90 L132 116 Z" fill="#f8fafc" opacity="0.88" />
      <text x="24" y="144" fill="#f8fafc" font-family="Segoe UI, sans-serif" font-size="24" font-weight="700">Scene A</text>
    </svg>
  `);

const initialTracks = [
  createTrack({
    id: 'dialogue',
    name: 'Dialogue',
    category: 'Voice',
    volume: 1,
  }),
  createTrack({
    id: 'fx',
    name: 'Effects',
    category: 'Design',
    volume: 0.9,
  }),
  createTrack({
    id: 'music',
    name: 'Music',
    category: 'Loop Lane',
    volume: 0.7,
  }),
];

const initialClips = [
  createClip({
    id: 'line-01',
    trackId: 'dialogue',
    name: 'Line 01',
    timelineStart: 0,
    sourceDuration: 3.4,
    sourceStart: 0,
    sourceEnd: 3.4,
    fillMode: 'trim',
    color: 'hsl(208 75% 54%)',
    mediaKind: 'audio',
    waveform: createWaveform(1),
    fade: {
      in: { duration: 0.2 },
      out: { duration: 0.35 },
    },
  }),
  createClip({
    id: 'scene-a',
    trackId: 'fx',
    name: 'Scene A',
    timelineStart: 4.2,
    sourceDuration: 2.8,
    sourceStart: 0,
    sourceEnd: 2.8,
    fillMode: 'trim',
    color: 'hsl(344 72% 56%)',
    mediaKind: 'video',
    posterUrl: videoPoster,
    waveform: createWaveform(4),
  }),
  createClip({
    id: 'whoosh',
    trackId: 'fx',
    name: 'Whoosh',
    timelineStart: 2.1,
    sourceDuration: 1.1,
    sourceStart: 0,
    sourceEnd: 1.1,
    fillMode: 'trim',
    color: 'hsl(22 85% 56%)',
    mediaKind: 'audio',
    waveform: createWaveform(2, 14),
  }),
  createClip({
    id: 'music-bed',
    trackId: 'music',
    name: 'Bed',
    timelineStart: 0,
    timelineDuration: 24,
    sourceDuration: 6,
    sourceStart: 0,
    sourceEnd: 6,
    fillMode: 'loop',
    color: 'hsl(149 60% 42%)',
    mediaKind: 'audio',
    waveform: createWaveform(3, 28),
    fade: {
      in: { duration: 1.5 },
      out: { duration: 1.5 },
    },
  }),
];

const trackHeader = ({ track, defaultContent }: TimelineTrackHeaderRenderArgs) => (
  <div className="example-trackHeader">
    <div className="example-trackMeta">
      <strong>{track.category ?? 'Track'}</strong>
      <span>{track.name}</span>
    </div>
    <div className="example-trackControls">{defaultContent}</div>
  </div>
);

export default function App() {
  const [tracks, setTracks] = useState(initialTracks);
  const [clips, setClips] = useState(initialClips);
  const [nextTrackNumber, setNextTrackNumber] = useState(4);
  const transport = useTimelineTransport({
    duration: TOTAL_DURATION,
    initialTime: 1.5,
  });

  const behavior = useMemo<TimelineEditorBehavior>(
    () => ({
      moveClip: ({ clip, nextTimelineStart, nextTrackId }) => {
        if (clip.id === 'music-bed') {
          return {
            trackId: 'music',
            timelineStart: Math.max(0, nextTimelineStart),
          };
        }

        return {
          trackId: nextTrackId,
          timelineStart: Math.max(0, nextTimelineStart),
        };
      },
      resizeClip: ({ clip, edge, nextTimelineDuration, nextTimelineStart }) => {
        if (clip.id !== 'music-bed') {
          return null;
        }

        if (edge === 'left') {
          return {
            timelineStart: nextTimelineStart,
            timelineDuration: Math.max(nextTimelineDuration ?? 0, 6),
          };
        }

        return {
          timelineDuration: Math.max(nextTimelineDuration ?? clip.timelineDuration, 6),
        };
      },
    }),
    [],
  );

  const addTrack = () => {
    const number = nextTrackNumber;
    const trackId = `layer-${number}`;
    const isLoopLane = number % 2 === 1;

    setNextTrackNumber(number + 1);
    setTracks((currentTracks) => [
      ...currentTracks,
      createTrack({
        id: trackId,
        name: `Layer ${number}`,
        category: isLoopLane ? 'Loop Lane' : 'Trim Lane',
        volume: 0.85,
      }),
    ]);
    setClips((currentClips) => [
      ...currentClips,
      createClip({
        id: `layer-clip-${number}`,
        trackId,
        name: `Layer ${number} Cue`,
        timelineStart: Math.min(number * 1.15, TOTAL_DURATION - 6),
        timelineDuration: isLoopLane ? 6 : undefined,
        sourceDuration: 3.5,
        sourceStart: 0,
        sourceEnd: 3.5,
        fillMode: isLoopLane ? 'loop' : 'trim',
        color: `hsl(${(number * 47) % 360} 72% 58%)`,
        mediaKind: number % 2 === 0 ? 'audio' : 'video',
        posterUrl: number % 2 === 0 ? undefined : videoPoster,
        waveform: createWaveform(number + 2),
      }),
    ]);
  };

  const removeLastTrack = () => {
    setTracks((currentTracks) => {
      const lastTrack = currentTracks.at(-1);
      if (!lastTrack) {
        return currentTracks;
      }

      setClips((currentClips) =>
        currentClips.filter((clip) => clip.trackId !== lastTrack.id),
      );

      return currentTracks.slice(0, -1);
    });
  };

  const summary = useMemo(
    () =>
      clips.map((clip) => ({
        id: clip.id,
        trackId: clip.trackId,
        fillMode: clip.fillMode,
        mediaKind: clip.mediaKind,
        timelineStart: Number(clip.timelineStart.toFixed(2)),
        timelineDuration: Number(clip.timelineDuration.toFixed(2)),
        sourceStart: Number(clip.sourceStart.toFixed(2)),
        sourceEnd: Number(clip.sourceEnd.toFixed(2)),
        sourceDuration: Number(clip.sourceDuration.toFixed(2)),
      })),
    [clips],
  );

  return (
    <main className="example-shell">
      <section className="example-copy">
        <p className="example-eyebrow">Timeline Example</p>
        <h1>source와 timeline을 분리한 모델 예제</h1>
        <p className="example-lead">
          일반 audio/video clip은 `trim` 모드라서 원본 길이를 넘겨 늘어나지
          않습니다. `music-bed`처럼 반복 가능한 clip만 `loop` 모드로 두고
          timeline duration을 따로 확장합니다.
        </p>
      </section>

      <section className="example-notes">
        <div className="example-note">
          <strong>Trim</strong>
          <span>원본 source 구간만 줄이거나 늘릴 수 있고, source를 넘길 수 없습니다.</span>
        </div>
        <div className="example-note">
          <strong>Loop</strong>
          <span>source는 그대로 두고 timeline duration만 확장해서 반복 재생합니다.</span>
        </div>
      </section>

      <section className="example-actions">
        <button className="example-actionButton" onClick={addTrack} type="button">
          Add Track
        </button>
        <button
          className="example-actionButton"
          onClick={removeLastTrack}
          type="button"
          disabled={tracks.length === 0}
        >
          Remove Last Track
        </button>
        <div className="example-actionMeta">
          <strong>{tracks.length}</strong>
          <span>tracks</span>
        </div>
        <div className="example-actionMeta">
          <strong>{clips.length}</strong>
          <span>clips</span>
        </div>
      </section>

      <section className="example-stage">
        <TimelineEditor
          tracks={tracks}
          clips={clips}
          currentTime={transport.currentTime}
          totalDuration={TOTAL_DURATION}
          isPlaying={transport.isPlaying}
          behavior={behavior}
          renderTrackHeader={trackHeader}
          onTracksChange={setTracks}
          onClipsChange={setClips}
          onSeek={transport.seek}
          onPlay={transport.play}
          onPause={transport.pause}
          onStop={transport.stop}
        />
      </section>

      <section className="example-panel">
        <div className="example-card">
          <h2>Tracks</h2>
          <pre>{JSON.stringify(tracks, null, 2)}</pre>
        </div>
        <div className="example-card">
          <h2>Clips</h2>
          <pre>{JSON.stringify(summary, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
