import { useEffect, useRef, useState } from 'react';

export const useTimelineViewport = ({
  leftColumnWidth,
  pxPerSec,
  totalDuration,
}: {
  leftColumnWidth: number;
  pxPerSec: number;
  totalDuration: number;
}) => {
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setViewportWidth(element.clientWidth);

    return () => observer.disconnect();
  }, []);

  const effectiveDuration = Math.max(totalDuration, 0.001);
  const contentWidth = Math.max(
    effectiveDuration * pxPerSec,
    Math.max(0, viewportWidth - leftColumnWidth),
  );

  return {
    viewportRef,
    viewportWidth,
    contentWidth,
    canvasWidth: leftColumnWidth + contentWidth,
  };
};
