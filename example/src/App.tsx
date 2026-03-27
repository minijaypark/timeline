import { useMemo, useState } from 'react';
import {
  TimelineEditor,
  createClip,
  createTrack,
} from '@minijay/timeline';
import '@minijay/timeline/timeline.css';
import './app.css';

const initialTracks = [
  createTrack({ id: 'dialogue', name: 'Dialogue', volume: 1 }),
  createTrack({ id: 'fx', name: 'Effects', volume: 0.9 }),
  createTrack({ id: 'music', name: 'Music', volume: 0.7 }),
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

export default function App() {
  const [tracks, setTracks] = useState(initialTracks);
  const [clips, setClips] = useState(initialClips);
  const [currentTime, setCurrentTime] = useState(1.5);
  const [isPlaying, setIsPlaying] = useState(false);

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
        <h1>독립 패키지 사용 예시</h1>
        <p className="example-lead">
          이 예제는 로컬 workspace 의존성으로 `@minijay/timeline`을 직접
          가져와서 편집 상태를 React state로 관리합니다. 클립을 드래그하거나
          좌우를 trim 하면 아래 JSON 미리보기가 바로 갱신됩니다.
        </p>
      </section>

      <section className="example-stage">
        <TimelineEditor
          tracks={tracks}
          clips={clips}
          currentTime={currentTime}
          totalDuration={30}
          isPlaying={isPlaying}
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
