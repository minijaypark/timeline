import { act, render } from '@testing-library/react';
import { type MutableRefObject, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimelineRegion } from './types';
import { useTransport } from './useTransport';

type TransportHandle = ReturnType<typeof useTransport>;

const rafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 1;

const flushFrame = (timestamp: number) => {
  const callbacks = [...rafCallbacks.values()];
  rafCallbacks.clear();
  callbacks.forEach((callback) => callback(timestamp));
};

const Harness = ({
  handleRef,
  initialTime = 0,
  loop = false,
  loopRegion = null,
}: {
  handleRef: MutableRefObject<TransportHandle | null>;
  initialTime?: number;
  loop?: boolean;
  loopRegion?: TimelineRegion | null;
}) => {
  const transport = useTransport({
    duration: 10,
    initialTime,
    loop,
    loopRegion,
  });

  useEffect(() => {
    handleRef.current = transport;
  }, [handleRef, transport]);

  return null;
};

describe('useTransport', () => {
  beforeEach(() => {
    nextRafId = 1;
    rafCallbacks.clear();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextRafId++;
      rafCallbacks.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    rafCallbacks.clear();
    vi.unstubAllGlobals();
  });

  it('clamps seek and stop to the active loop region', () => {
    const handleRef = { current: null as TransportHandle | null };

    render(
      <Harness
        handleRef={handleRef}
        initialTime={0}
        loop
        loopRegion={{ start: 2, end: 4 }}
      />,
    );

    expect(handleRef.current?.currentTime).toBe(2);

    act(() => {
      handleRef.current?.seek(9);
    });

    expect(handleRef.current?.currentTime).toBe(4);

    act(() => {
      handleRef.current?.stop();
    });

    expect(handleRef.current?.currentTime).toBe(2);
  });

  it('wraps playback within the selected loop region', () => {
    const handleRef = { current: null as TransportHandle | null };

    render(
      <Harness
        handleRef={handleRef}
        initialTime={3.8}
        loop
        loopRegion={{ start: 2, end: 4 }}
      />,
    );

    act(() => {
      handleRef.current?.play();
    });

    act(() => {
      flushFrame(1000);
    });

    act(() => {
      flushFrame(1500);
    });

    expect(handleRef.current?.currentTime).toBeCloseTo(2.3, 5);
  });
});
