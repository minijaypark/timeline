import { useMemo, useState } from 'react';
import {
  TimelineEditor,
  createClip,
  createTrack,
  type TimelineEditorBehavior,
  type TimelineTrackHeaderRenderArgs,
} from '@minijay/timeline';
import '@minijay/timeline/timeline.css';
import './app.css';

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
    category: 'Locked Lane',
    volume: 0.7,
  }),
];

const initialClips = [
  createClip({
    id: 'line-01',
    trackId: 'dialogue',
    name: 'Line 01',
    startOffset: 0,
    start: 0,
    end: 3.4,
    duration: 3.4,
    color: 'hsl(208 75% 54%)',
    fade: {
      in: { duration: 0.2 },
      out: { duration: 0.35 },
    },
  }),
  createClip({
    id: 'whoosh',
    trackId: 'fx',
    name: 'Whoosh',
    startOffset: 2.1,
    start: 0,
    end: 1.1,
    duration: 1.1,
    color: 'hsl(22 85% 56%)',
  }),
  createClip({
    id: 'music-bed',
    trackId: 'music',
    name: 'Bed',
    startOffset: 0,
    start: 12,
    end: 24,
    duration: 40,
    color: 'hsl(149 60% 42%)',
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
  const [currentTime, setCurrentTime] = useState(1.5);
  const [isPlaying, setIsPlaying] = useState(false);

  const behavior = useMemo<TimelineEditorBehavior>(
    () => ({
      moveClip: ({ clip, nextStartOffset, nextTrackId }) => {
        if (clip.id === 'music-bed') {
          return {
            trackId: 'music',
            startOffset: Math.max(0, nextStartOffset),
          };
        }

        return {
          trackId: nextTrackId,
          startOffset: Math.max(0, nextStartOffset),
        };
      },
      resizeClip: ({ clip, edge, nextEnd, nextStart }) => {
        if (clip.id !== 'music-bed') {
          return edge === 'left' ? { start: nextStart } : { end: nextEnd };
        }

        if (edge === 'left') {
          return {
            start: Math.min(nextStart ?? clip.start, clip.end - 4),
          };
        }

        return {
          end: Math.max(nextEnd ?? clip.end, clip.start + 4),
        };
      },
    }),
    [],
  );

  const summary = useMemo(
    () =>
      clips.map((clip) => ({
        id: clip.id,
        trackId: clip.trackId,
        timelineStart: Number((clip.startOffset + clip.start).toFixed(2)),
        timelineEnd: Number((clip.startOffset + clip.end).toFixed(2)),
      })),
    [clips],
  );

  return (
    <main className="example-shell">
      <section className="example-copy">
        <p className="example-eyebrow">Timeline Example</p>
        <h1>확장 포인트 중심 예제</h1>
        <p className="example-lead">
          이 예제는 `behavior`와 `renderTrackHeader`를 같이 사용합니다.
          music lane은 다른 트랙으로 못 옮기고, 최소 길이도 강제됩니다.
          헤더도 기본 UI 위에 카테고리 메타데이터를 덧붙여서 렌더링합니다.
        </p>
      </section>

      <section className="example-notes">
        <div className="example-note">
          <strong>Behavior</strong>
          <span>clip move/resize 규칙을 외부에서 제어합니다.</span>
        </div>
        <div className="example-note">
          <strong>Render Slot</strong>
          <span>track header는 기본 컨트롤을 유지한 채 감쌀 수 있습니다.</span>
        </div>
      </section>

      <section className="example-stage">
        <TimelineEditor
          tracks={tracks}
          clips={clips}
          currentTime={currentTime}
          totalDuration={30}
          isPlaying={isPlaying}
          behavior={behavior}
          renderTrackHeader={trackHeader}
          onTracksChange={setTracks}
          onClipsChange={setClips}
          onSeek={setCurrentTime}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onStop={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
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
