import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useRef,
} from 'react';
import type { TimelineClip } from './types';
import { clamp } from './utils';

const INTERACTIVE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
const SEEK_SMALL_SEC = 0.1;
const SEEK_LARGE_SEC = 1;

const isInteractiveElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return INTERACTIVE_TAGS.has(target.tagName);
};

export const useEditorShortcuts = ({
  clips,
  currentTime,
  enabled,
  maxZoom,
  minZoom,
  onClipsChange,
  onPause,
  onPlay,
  onSeek,
  onSelectedClipIdsChange,
  onStop,
  selectedClipIds,
  totalDuration,
  zoom,
  zoomStep,
  onZoomChange,
}: {
  clips: TimelineClip[];
  currentTime: number;
  enabled: boolean;
  maxZoom: number;
  minZoom: number;
  onClipsChange?: (clips: TimelineClip[]) => void;
  onPause?: () => void;
  onPlay?: () => void;
  onSeek?: (time: number) => void;
  onSelectedClipIdsChange: (clipIds: string[]) => void;
  onStop?: () => void;
  selectedClipIds: string[];
  totalDuration: number;
  zoom: number;
  zoomStep: number;
  onZoomChange: (zoom: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const seekBy = (delta: number) => {
    if (!onSeek) {
      return;
    }

    onSeek(clamp(currentTime + delta, 0, totalDuration));
  };

  const applyZoomDelta = (delta: number) => {
    onZoomChange(clamp(zoom + delta, minZoom, maxZoom));
  };

  return {
    containerRef,
    handleKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!enabled || event.defaultPrevented || isInteractiveElement(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (event.key === ' ' || event.code === 'Space') {
        if (!onPlay && !onPause) {
          return;
        }

        event.preventDefault();
        if (event.currentTarget.dataset.playing === 'true') {
          onPause?.();
        } else {
          onPlay?.();
        }
        return;
      }

      if (key === 'k') {
        if (!onStop) {
          return;
        }

        event.preventDefault();
        onStop();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(event.shiftKey ? -SEEK_LARGE_SEC : -SEEK_SMALL_SEC);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(event.shiftKey ? SEEK_LARGE_SEC : SEEK_SMALL_SEC);
        return;
      }

      if (event.key === 'Escape') {
        if (selectedClipIds.length === 0) {
          return;
        }

        event.preventDefault();
        onSelectedClipIdsChange([]);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        if (!onClipsChange || selectedClipIds.length === 0) {
          return;
        }

        event.preventDefault();
        onClipsChange(
          clips.filter((clip) => !selectedClipIds.includes(clip.id)),
        );
        onSelectedClipIdsChange([]);
        return;
      }

      if (key === '-' || key === '_') {
        event.preventDefault();
        applyZoomDelta(-zoomStep);
        return;
      }

      if (key === '=' || key === '+') {
        event.preventDefault();
        applyZoomDelta(zoomStep);
      }
    },
    handlePointerDownCapture: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || isInteractiveElement(event.target)) {
        return;
      }

      containerRef.current?.focus({ preventScroll: true });
    },
    handleWheelCapture: (event: ReactWheelEvent<HTMLDivElement>) => {
      if (
        !enabled ||
        isInteractiveElement(event.target) ||
        !(event.metaKey || event.ctrlKey) ||
        event.deltaY === 0
      ) {
        return;
      }

      event.preventDefault();
      applyZoomDelta(event.deltaY < 0 ? zoomStep : -zoomStep);
    },
  };
};
