# Timeline

`sound-client` 타임라인에서 앱 종속 기능을 걷어내고 재사용 가능한 코어 편집기로 분리한 패키지입니다.

포함 범위:

- 트랙/클립 데이터 모델
- `useTimelineTransport` 기반 playback state
- 타임라인 ruler, playhead, zoom
- 클립 선택, 이동, 좌우 trim
- track mute/solo/volume 편집
- ruler 기반 region selection
- clip 렌더 슬롯
- audio waveform / video badge / poster 기본 렌더
- behavior 기반 move/resize/select 규칙 주입
- track header 렌더 슬롯

제외 범위:

- 프로젝트 API 연동
- auto-save
- toast, i18n, app shell
- sound generation, enhancement, export
- WaveSurfer 기반 파형 렌더링

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Usage

```tsx
import {
  TimelineEditor,
  createClip,
  createTrack,
  type TimelineEditorBehavior,
  useTimelineTransport,
} from '@minijay/timeline';

const tracks = [createTrack({ id: 'dialogue', name: 'Dialogue' })];
const clips = [
  createClip({
    id: 'line-01',
    trackId: 'dialogue',
    name: 'Line 01',
    startOffset: 0,
    start: 0,
    end: 3.2,
    duration: 3.2,
  }),
];

const behavior: TimelineEditorBehavior = {
  moveClip: ({ clip, nextStartOffset, nextTrackId }) =>
    clip.id === 'music-bed'
      ? { trackId: 'music', startOffset: Math.max(0, nextStartOffset) }
      : { trackId: nextTrackId, startOffset: nextStartOffset },
};

const transport = useTimelineTransport({
  duration: 12,
  initialTime: 0,
});

<TimelineEditor
  tracks={tracks}
  clips={clips}
  totalDuration={12}
  currentTime={transport.currentTime}
  isPlaying={transport.isPlaying}
  behavior={behavior}
  onClipsChange={setClips}
  onTracksChange={setTracks}
  onSeek={transport.seek}
  onPlay={transport.play}
  onPause={transport.pause}
  onStop={transport.stop}
/>;
```

### Extension Points

- `useTimelineTransport`: playback state and controls
- `renderClip`: clip body custom rendering
- `renderTrackHeader`: header lane custom rendering
- `behavior.selectClips`: selection rule override
- `behavior.moveClip`: drag placement rule override
- `behavior.resizeClip`: trim rule override
- `clip.mediaKind`, `clip.waveform`, `clip.posterUrl`: media rendering hints

## Example

```bash
pnpm dev:example
```

`example/` 아래에 Vite 기반 샘플 앱이 있고, 로컬 workspace 의존성으로 이 패키지를 직접 사용합니다.
