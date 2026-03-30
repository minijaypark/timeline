# Timeline

`sound-client` 타임라인에서 앱 종속 기능을 걷어내고 재사용 가능한 코어 편집기로 분리한 패키지입니다.

포함 범위:

- 트랙/클립 데이터 모델
- `useTransport` 기반 playback state
- preview viewer (`Preview`)
- 타임라인 ruler, playhead, zoom
- 클립 선택, 이동, 좌우 trim
- fade in / fade out 표시 및 드래그 편집
- track mute/solo/volume 편집
- ruler 기반 region selection
- clip 렌더 슬롯
- WaveSurfer 기반 실제 audio waveform / video badge / poster 기본 렌더
- 여러 비디오가 같은 시간대에 겹치면 위쪽 트랙이 아래 트랙을 덮는 layer 합성 규칙
- behavior 기반 move/resize/select 규칙 주입
- track header 렌더 슬롯
- `trim/loop/stretch/placeholder` fill mode

제외 범위:

- 프로젝트 API 연동
- auto-save
- toast, i18n, app shell
- sound generation, enhancement, export

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
  Editor,
  Preview,
  createClip,
  createTrack,
  type TimelineEditorBehavior,
  useTransport,
} from '@minijay/timeline';

const tracks = [createTrack({ id: 'dialogue', name: 'Dialogue' })];
const clips = [
  createClip({
    id: 'line-01',
    trackId: 'dialogue',
    name: 'Line 01',
    timelineStart: 0,
    sourceDuration: 3.2,
    sourceStart: 0,
    sourceEnd: 3.2,
    fillMode: 'trim',
  }),
  createClip({
    id: 'music-bed',
    trackId: 'dialogue',
    name: 'Bed',
    timelineStart: 4,
    timelineDuration: 12,
    sourceDuration: 3,
    sourceStart: 0,
    sourceEnd: 3,
    fillMode: 'loop',
  }),
];

const behavior: TimelineEditorBehavior = {
  moveClip: ({ clip, nextTimelineStart, nextTrackId }) =>
    clip.id === 'music-bed'
      ? { trackId: 'music', timelineStart: Math.max(0, nextTimelineStart) }
      : { trackId: nextTrackId, timelineStart: nextTimelineStart },
};

const transport = useTransport({
  duration: 12,
  playbackEnd: 10.2,
  initialTime: 0,
});

<Preview
  tracks={tracks}
  clips={clips}
  currentTime={transport.currentTime}
  isPlaying={transport.isPlaying}
/>;

<Editor
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

- `useTransport`: playback state and controls
- `useTransport.playbackEnd`: canvas 길이와 별도로 실제 재생 종료 시점을 지정
- `useMediaPlayback`: HTMLMediaElement source sync + track volume/mute/solo + clip fade gain
- `Preview`: 현재 시점의 비디오 레이어 합성 + source media playback
- `renderClip`: clip body custom rendering
- `renderTrackHeader`: header lane custom rendering
- `behavior.selectClips`: selection rule override
- `behavior.moveClip`: drag placement rule override
- `behavior.resizeClip`: trim rule override
- `clip.mediaKind`, `clip.waveform`, `clip.posterUrl`: media rendering hints
- `clip.thumbnails`: 비디오 클립 썸네일 스트립 / preview fallback frame
- audio clip에 `cachedUrl` 또는 `originalUrl`이 있으면 실제 오디오 peak를 읽고, 없으면 `clip.waveform`으로 fallback

### Timing Model

- `timelineStart`: clip starts at this project time
- `timelineDuration`: how much space the clip occupies on the timeline
- `sourceDuration`: original media length
- `sourceStart`, `sourceEnd`: trimmed source range
- `fillMode: 'trim'`: default audio/video clip, cannot exceed source range
- `fillMode: 'loop'`: timeline duration may exceed source range by repeating
- `fillMode: 'stretch'`: timeline duration may exceed source range by time-stretching
- `fillMode: 'placeholder'`: temporary block without finalized source media
- 같은 시간에 여러 비디오가 활성화되면 트랙 배열의 위쪽(더 앞 index) 트랙이 시각적으로 위에 합성됩니다.

## Example

```bash
pnpm dev:example
```

`example/` 아래에 Vite 기반 샘플 앱이 있고, 로컬 workspace 의존성으로 이 패키지를 직접 사용합니다.
