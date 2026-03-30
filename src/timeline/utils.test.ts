import { describe, expect, it } from 'vitest';
import { createClip } from './types';
import { updateClipList } from './utils';

describe('updateClipList', () => {
  it('maps legacy move results to timelineStart', () => {
    const clip = createClip({
      id: 'clip-1',
      trackId: 'track-1',
      name: 'Clip 1',
      timelineStart: 5,
      sourceDuration: 10,
      sourceStart: 2,
      sourceEnd: 5,
    });

    const [updatedClip] = updateClipList([clip], clip.id, {
      startOffset: 10,
    });

    expect(updatedClip.timelineStart).toBe(12);
    expect(updatedClip.startOffset).toBe(10);
  });

  it('maps legacy resize results to canonical timing fields', () => {
    const clip = createClip({
      id: 'clip-2',
      trackId: 'track-1',
      name: 'Clip 2',
      timelineStart: 5,
      sourceDuration: 10,
      sourceStart: 2,
      sourceEnd: 5,
    });

    const [updatedClip] = updateClipList([clip], clip.id, {
      start: 1,
      end: 6,
    });

    expect(updatedClip.sourceStart).toBe(1);
    expect(updatedClip.sourceEnd).toBe(6);
    expect(updatedClip.timelineStart).toBe(4);
    expect(updatedClip.timelineDuration).toBe(5);
  });
});
