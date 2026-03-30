import { useEffect, useMemo, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { TimelineClip } from '../types';
import {
  clamp,
  clipVisibleDuration,
  getClipFillMode,
  getClipPlaybackRate,
  getClipSourceDuration,
  getClipSourceEnd,
  getClipSourceStart,
} from '../utils';

const MAX_PEAK_LENGTH = 4096;
const waveformPeakCache = new Map<string, Promise<number[]>>();

const loadWaveformPeaks = (url: string) => {
  const cached = waveformPeakCache.get(url);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    if (typeof document === 'undefined') {
      return [];
    }

    const container = document.createElement('div');
    const wavesurfer = WaveSurfer.create({
      autoCenter: false,
      autoScroll: false,
      container,
      cursorWidth: 0,
      dragToSeek: false,
      height: 24,
      hideScrollbar: true,
      interact: false,
    });

    try {
      await wavesurfer.load(url);
      const exported = wavesurfer.exportPeaks({
        channels: 2,
        maxLength: MAX_PEAK_LENGTH,
        precision: 10_000,
      });

      if (!Array.isArray(exported) || exported.length === 0) {
        return [];
      }

      const maxSamples = exported.reduce(
        (currentMax, channel) => Math.max(currentMax, channel.length),
        0,
      );

      return Array.from({ length: maxSamples }, (_, index) => {
        let total = 0;
        let count = 0;

        for (const channel of exported) {
          const sample = channel[index];
          if (typeof sample !== 'number') {
            continue;
          }
          total += Math.abs(sample);
          count += 1;
        }

        if (count === 0) {
          return 0;
        }

        return clamp(total / count, 0, 1);
      });
    } finally {
      wavesurfer.destroy();
    }
  })().catch((error) => {
    waveformPeakCache.delete(url);
    throw error;
  });

  waveformPeakCache.set(url, request);
  return request;
};

const getDisplayPointCount = (width: number) =>
  clamp(Math.round(width / 4), 12, 160);

const getSourceSample = (
  peaks: number[],
  sourceTime: number,
  sourceDuration: number,
) => {
  if (peaks.length === 0 || sourceDuration <= 0) {
    return 0;
  }

  const ratio = clamp(sourceTime / sourceDuration, 0, 0.999999);
  const index = Math.min(peaks.length - 1, Math.floor(ratio * peaks.length));
  return peaks[index] ?? 0;
};

const getFallbackWaveform = (waveform: number[] | undefined, width: number) => {
  if (!waveform || waveform.length === 0) {
    return [];
  }

  const pointCount = Math.min(getDisplayPointCount(width), waveform.length);
  return Array.from({ length: pointCount }, (_, index) => {
    const sourceIndex = Math.floor((index / pointCount) * waveform.length);
    return clamp(waveform[sourceIndex] ?? 0, 0, 1);
  });
};

const getClipWaveform = (clip: TimelineClip, peaks: number[], width: number) => {
  if (peaks.length === 0 || width <= 0) {
    return [];
  }

  const sourceDuration = getClipSourceDuration(clip);
  const sourceStart = getClipSourceStart(clip);
  const sourceEnd = getClipSourceEnd(clip);
  const playbackRate = getClipPlaybackRate(clip);
  const fillMode = getClipFillMode(clip);
  const pointCount = getDisplayPointCount(width);
  const trimmedDuration = Math.max(0, sourceEnd - sourceStart);
  const timelineDuration = clipVisibleDuration(clip);

  if (sourceDuration <= 0 || trimmedDuration <= 0 || timelineDuration <= 0) {
    return [];
  }

  const loopVisibleSourceDuration =
    fillMode === 'loop'
      ? Math.max(trimmedDuration, timelineDuration * playbackRate)
      : trimmedDuration;

  return Array.from({ length: pointCount }, (_, index) => {
    const ratio = pointCount === 1 ? 0 : index / (pointCount - 1);

    if (fillMode === 'loop') {
      const loopSourceTime =
        sourceStart + ((ratio * loopVisibleSourceDuration) % trimmedDuration);
      return getSourceSample(peaks, loopSourceTime, sourceDuration);
    }

    const sourceTime = sourceStart + ratio * trimmedDuration;
    return getSourceSample(peaks, sourceTime, sourceDuration);
  });
};

export const AudioWaveform = ({
  clip,
  width,
}: {
  clip: TimelineClip;
  width: number;
}) => {
  const sourceUrl = clip.cachedUrl ?? clip.originalUrl;
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    if (!sourceUrl) {
      setPeaks(null);
      return;
    }

    let cancelled = false;
    setPeaks(null);

    loadWaveformPeaks(sourceUrl)
      .then((nextPeaks) => {
        if (!cancelled) {
          setPeaks(nextPeaks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeaks([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  const samples = useMemo(() => {
    if (peaks && peaks.length > 0) {
      const actual = getClipWaveform(clip, peaks, width);
      if (actual.length > 0) {
        return actual;
      }
    }

    return getFallbackWaveform(clip.waveform, width);
  }, [clip, peaks, width]);

  if (samples.length === 0) {
    return null;
  }

  return (
    <div
      className="tl-waveform"
      data-waveform-source={peaks && peaks.length > 0 ? 'actual' : 'fallback'}
      aria-hidden="true"
    >
      {samples.map((sample, index) => (
        <span
          key={`${clip.id}-${index}`}
          className="tl-waveformBar"
          style={{
            height: `${Math.max(16, Math.min(100, sample * 100))}%`,
          }}
        />
      ))}
    </div>
  );
};
