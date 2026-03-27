import { useEffect, useRef, useState } from 'react';
import type { TimelineRegion } from './types';
import { clamp } from './utils';

export const useTimelineTransport = ({
  duration,
  initialTime = 0,
  initialPlaying = false,
  loop = false,
  loopRegion = null,
  playbackRate = 1,
}: {
  duration: number;
  initialTime?: number;
  initialPlaying?: boolean;
  loop?: boolean;
  loopRegion?: TimelineRegion | null;
  playbackRate?: number;
}) => {
  const [currentTime, setCurrentTime] = useState(() =>
    clamp(initialTime, 0, duration),
  );
  const [isPlaying, setIsPlaying] = useState(initialPlaying);
  const frameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentTime((time) => clamp(time, 0, duration));
  }, [duration]);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    const tick = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const deltaSeconds =
        ((timestamp - lastFrameTimeRef.current) / 1000) * playbackRate;
      lastFrameTimeRef.current = timestamp;

      let shouldStop = false;

      setCurrentTime((time) => {
        const nextTime = time + deltaSeconds;
        if (!loop || !loopRegion || loopRegion.end <= loopRegion.start) {
          if (nextTime >= duration) {
            shouldStop = true;
            return duration;
          }
          return nextTime;
        }

        if (nextTime <= loopRegion.end) {
          return nextTime;
        }

        const loopDuration = loopRegion.end - loopRegion.start;
        const overshoot = nextTime - loopRegion.start;
        return loopRegion.start + (overshoot % loopDuration);
      });

      if (shouldStop) {
        setIsPlaying(false);
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastFrameTimeRef.current = null;
    };
  }, [duration, isPlaying, loop, loopRegion, playbackRate]);

  return {
    currentTime,
    isPlaying,
    pause: () => setIsPlaying(false),
    play: () => setIsPlaying(true),
    seek: (time: number) => setCurrentTime(clamp(time, 0, duration)),
    setCurrentTime: (time: number) => setCurrentTime(clamp(time, 0, duration)),
    setIsPlaying,
    stop: () => {
      setIsPlaying(false);
      setCurrentTime(0);
    },
    toggle: () => setIsPlaying((playing) => !playing),
  };
};
