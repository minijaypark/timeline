import { formatTime } from '../utils';

export const Toolbar = ({
  currentTime,
  loop = false,
  loopDisabled = false,
  maxZoom,
  minZoom,
  onLoopChange,
  onPause,
  onPlay,
  onStop,
  onZoomChange,
  totalDuration,
  zoom,
  zoomStep,
}: {
  currentTime: number;
  loop?: boolean;
  loopDisabled?: boolean;
  maxZoom: number;
  minZoom: number;
  onLoopChange?: (loop: boolean) => void;
  onPause?: () => void;
  onPlay?: () => void;
  onStop?: () => void;
  onZoomChange: (zoom: number) => void;
  totalDuration: number;
  zoom: number;
  zoomStep: number;
}) => (
  <div className="tl-toolbar">
    <div className="tl-toolbarGroup">
      <button className="tl-button" onClick={onPlay} disabled={!onPlay}>
        Play
      </button>
      <button className="tl-button" onClick={onPause} disabled={!onPause}>
        Pause
      </button>
      <button className="tl-button" onClick={onStop} disabled={!onStop}>
        Stop
      </button>
      <button
        aria-pressed={loop}
        className="tl-button"
        data-active={loop}
        disabled={loopDisabled || !onLoopChange}
        onClick={() => onLoopChange?.(!loop)}
      >
        Loop
      </button>
    </div>
    <div className="tl-toolbarGroup">
      <span className="tl-timeValue">{formatTime(currentTime)}</span>
      <span className="tl-timeValue">/ {formatTime(totalDuration)}</span>
    </div>
    <div className="tl-toolbarSpacer" />
    <div className="tl-toolbarGroup">
      <span className="tl-zoomValue">{(zoom * 100).toFixed(0)}%</span>
      <input
        className="tl-zoomInput"
        type="range"
        min={minZoom}
        max={maxZoom}
        step={zoomStep}
        value={zoom}
        onChange={(event) => onZoomChange(Number.parseFloat(event.target.value))}
      />
    </div>
  </div>
);
