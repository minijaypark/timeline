import type { PointerEvent as ReactPointerEvent } from 'react';

export const TimelineRuler = ({
  contentWidth,
  onPointerDown,
  ticks,
}: {
  contentWidth: number;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  ticks: Array<{ left: number; label?: string; strong: boolean }>;
}) => (
  <div className="tl-ruler">
    <div
      className="tl-rulerInner"
      style={{ width: contentWidth }}
      onPointerDown={onPointerDown}
    >
      {ticks.map((tick) => (
        <div
          key={tick.left}
          className="tl-rulerTick"
          data-strong={tick.strong}
          style={{ left: tick.left }}
        >
          {tick.label}
        </div>
      ))}
    </div>
  </div>
);
