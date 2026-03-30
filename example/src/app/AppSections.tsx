import { type ChangeEvent, type ReactNode } from 'react';
import { type TimelineTrack } from '@minijay/timeline';

type ExampleActionsBarProps = {
  isUploading: boolean;
  trackCount: number;
  clipCount: number;
  uploadedCount: number;
  totalDuration: number;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onAddTrack: () => void;
  onRemoveLastTrack: () => void;
};

type ExampleDebugPanelProps = {
  tracks: TimelineTrack[];
  summary: unknown[];
};

const SectionHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="example-libraryHeader">
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  </div>
);

export const ExampleIntro = () => (
  <>
    <section className="example-copy">
      <p className="example-eyebrow">Timeline Example</p>
      <h1>audio/video source를 다루는 timeline 예제</h1>
      <p className="example-lead">
        파일 업로드, clip 편집, transport 재생, source preview를 한 화면에서
        확인할 수 있습니다.
      </p>
    </section>

    <section className="example-notes">
      <div className="example-note">
        <strong>Layers</strong>
        <span>같은 시간대에 비디오가 겹치면 위쪽 트랙이 아래 트랙을 덮고, preview는 레이어 스택으로 합성됩니다.</span>
      </div>
      <div className="example-note">
        <strong>Preview</strong>
        <span>timeline transport와 연결된 viewer가 현재 프레임을 보여주고, source 카드는 원본 확인용으로 남겨둡니다.</span>
      </div>
      <div className="example-note">
        <strong>Shortcuts</strong>
        <span>timeline을 클릭한 뒤 Space, Arrow keys, Delete, +/- 로 편집 흐름을 바로 확인할 수 있습니다.</span>
      </div>
    </section>
  </>
);

export const ExampleActionsBar = ({
  isUploading,
  trackCount,
  clipCount,
  uploadedCount,
  totalDuration,
  onFileUpload,
  onAddTrack,
  onRemoveLastTrack,
}: ExampleActionsBarProps) => (
  <section className="example-actions">
    <label className="example-uploadButton">
      <input
        className="example-fileInput"
        type="file"
        accept="audio/*,video/*"
        multiple
        onChange={onFileUpload}
      />
      {isUploading ? 'Uploading...' : 'Upload Media'}
    </label>
    <button className="example-actionButton" onClick={onAddTrack} type="button">
      Add Track
    </button>
    <button
      className="example-actionButton"
      onClick={onRemoveLastTrack}
      type="button"
      disabled={trackCount === 0}
    >
      Remove Last Track
    </button>
    <div className="example-actionMeta">
      <strong>{trackCount}</strong>
      <span>tracks</span>
    </div>
    <div className="example-actionMeta">
      <strong>{clipCount}</strong>
      <span>clips</span>
    </div>
    <div className="example-actionMeta">
      <strong>{uploadedCount}</strong>
      <span>uploaded</span>
    </div>
    <div className="example-actionMeta">
      <strong>{totalDuration}s</strong>
      <span>duration</span>
    </div>
  </section>
);

export const ExamplePreviewSection = ({ children }: { children: ReactNode }) => (
  <section className="example-card">
    <SectionHeader
      title="Preview Viewer"
      description="현재 playhead 시점의 비디오 레이어를 위 트랙 우선 규칙으로 합성합니다."
    />
    {children}
  </section>
);

export const ExampleUploadedMediaSection = ({
  children,
}: {
  children: ReactNode;
}) => (
  <section className="example-card">
    <SectionHeader
      title="Uploaded Media"
      description="카드를 클릭하면 해당 clip이 선택되고, 원본 source player를 직접 확인할 수 있습니다."
    />
    {children}
  </section>
);

export const ExampleDebugPanel = ({
  tracks,
  summary,
}: ExampleDebugPanelProps) => (
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
);
