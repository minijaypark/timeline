import { useEffect, useRef, useState } from 'react';
import type { TimelineRegion } from './types';
import { clamp } from './utils';

export const useTransport = ({
  duration,
  playbackEnd = duration,
  initialTime = 0,
  initialPlaying = false,
  loop = false,
  loopRegion = null,
  playbackRate = 1,
}: {
  duration: number;
  playbackEnd?: number;
  initialTime?: number;
  initialPlaying?: boolean;
  loop?: boolean;
  loopRegion?: TimelineRegion | null;
  playbackRate?: number;
}) => {
  const resolvedPlaybackEnd = clamp(playbackEnd, 0, duration);
  const hasValidLoopRegion =
    loop &&
    loopRegion !== null &&
    Number.isFinite(loopRegion.start) &&
    Number.isFinite(loopRegion.end) &&
    loopRegion.end > loopRegion.start;
  const resolvedLoopStart = hasValidLoopRegion
    ? clamp(loopRegion.start, 0, duration)
    : 0;
  const resolvedLoopEnd = hasValidLoopRegion
    ? clamp(loopRegion.end, resolvedLoopStart, duration)
    : 0;
  const resolvedStopTime = hasValidLoopRegion ? resolvedLoopStart : 0;
  const [currentTime, setCurrentTime] = useState(() =>
    clamp(initialTime, 0, duration),
  );
  const [isPlaying, setIsPlaying] = useState(initialPlaying);
  const frameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentTime((time) =>
      hasValidLoopRegion
        ? clamp(time, resolvedLoopStart, resolvedLoopEnd)
        : clamp(time, 0, duration),
    );
  }, [duration, hasValidLoopRegion, resolvedLoopEnd, resolvedLoopStart]);

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
        if (!hasValidLoopRegion) {
          if (nextTime >= resolvedPlaybackEnd) {
            shouldStop = true;
            return resolvedPlaybackEnd;
          }
          return nextTime;
        }

        if (nextTime <= resolvedLoopStart) {
          return resolvedLoopStart;
        }

        if (nextTime <= resolvedLoopEnd) {
          return nextTime;
        }

        const loopDuration = resolvedLoopEnd - resolvedLoopStart;
        const overshoot = nextTime - resolvedLoopStart;
        return resolvedLoopStart + (overshoot % loopDuration);
      });

      if (shouldStop) {
        setIsPlaying(false);
        setCurrentTime(resolvedStopTime);
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
  }, [
    hasValidLoopRegion,
    isPlaying,
    playbackRate,
    resolvedLoopEnd,
    resolvedLoopStart,
    resolvedPlaybackEnd,
  ]);

  return {
    currentTime,
    isPlaying,
    pause: () => setIsPlaying(false),
    play: () => setIsPlaying(true),
    seek: (time: number) =>
      setCurrentTime(
        hasValidLoopRegion
          ? clamp(time, resolvedLoopStart, resolvedLoopEnd)
          : clamp(time, 0, duration),
      ),
    setCurrentTime: (time: number) =>
      setCurrentTime(
        hasValidLoopRegion
          ? clamp(time, resolvedLoopStart, resolvedLoopEnd)
          : clamp(time, 0, duration),
      ),
    setIsPlaying,
    stop: () => {
      setIsPlaying(false);
      setCurrentTime(resolvedStopTime);
    },
    toggle: () => setIsPlaying((playing) => !playing),
  };
};
