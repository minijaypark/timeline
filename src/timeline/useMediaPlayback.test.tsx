import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClip, createTrack } from './types';
import { useMediaPlayback } from './useMediaPlayback';

const disconnectSource = vi.fn();
const disconnectGain = vi.fn();
const closeAudioContext = vi.fn().mockResolvedValue(undefined);
const resumeAudioContext = vi.fn().mockResolvedValue(undefined);
const createMediaElementSource = vi.fn(() => ({
  connect: vi.fn(),
  disconnect: disconnectSource,
}));
const createGain = vi.fn(() => ({
  connect: vi.fn(),
  disconnect: disconnectGain,
  gain: { value: 1 },
}));

class MockAudioContext {
  destination = {};
  state = 'running';
  close = closeAudioContext;
  resume = resumeAudioContext;
  createMediaElementSource = createMediaElementSource;
  createGain = createGain;
}

Object.defineProperty(window, 'AudioContext', {
  configurable: true,
  value: MockAudioContext,
});

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
});

const track = createTrack({ id: 'track-1', name: 'Track 1' });

const Harness = ({ clipCount }: { clipCount: number }) => {
  const clips = Array.from({ length: clipCount }, (_, index) =>
    createClip({
      id: `clip-${index}`,
      trackId: track.id,
      name: `Clip ${index}`,
      timelineStart: 0,
      sourceDuration: 4,
      sourceStart: 0,
      sourceEnd: 4,
      originalUrl: `https://example.com/${index}.mp3`,
    }),
  );
  const { registerMediaElement } = useMediaPlayback({
    clips,
    currentTime: 1,
    isPlaying: false,
    tracks: [track],
  });

  return (
    <>
      {clips.map((clip) => (
        <audio
          key={clip.id}
          ref={(element) => registerMediaElement(clip.id, element)}
        />
      ))}
    </>
  );
};

describe('useMediaPlayback', () => {
  afterEach(() => {
    disconnectSource.mockClear();
    disconnectGain.mockClear();
    closeAudioContext.mockClear();
    resumeAudioContext.mockClear();
    createMediaElementSource.mockClear();
    createGain.mockClear();
  });

  it('disconnects audio graph nodes when a clip is removed', () => {
    const view = render(<Harness clipCount={1} />);

    expect(createMediaElementSource).toHaveBeenCalledTimes(1);
    expect(createGain).toHaveBeenCalledTimes(1);

    view.rerender(<Harness clipCount={0} />);

    expect(disconnectSource).toHaveBeenCalledTimes(1);
    expect(disconnectGain).toHaveBeenCalledTimes(1);
  });
});
