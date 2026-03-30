import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { TimelineClip, TimelineTrack } from './types';
import {
  clamp,
  clipTimelineStart,
  getClipPlaybackPosition,
  getClipSourceUrl,
  getClipTimelineDuration,
  getElementPlaybackRate,
  getSoloTrackIds,
  isTrackAudible,
} from './utils';

const getClipFadeGain = (clip: TimelineClip, currentTime: number) => {
  const timelineDuration = getClipTimelineDuration(clip);
  const localTime = currentTime - clipTimelineStart(clip);

  if (localTime < 0 || localTime > timelineDuration || timelineDuration <= 0) {
    return 0;
  }

  const fadeInDuration = Math.max(0, clip.fade?.in?.duration ?? 0);
  const fadeOutDuration = Math.max(0, clip.fade?.out?.duration ?? 0);
  const fadeInGain =
    fadeInDuration > 0 ? clamp(localTime / fadeInDuration, 0, 1) : 1;
  const fadeOutStart = Math.max(0, timelineDuration - fadeOutDuration);
  const fadeOutGain =
    fadeOutDuration > 0 && localTime >= fadeOutStart
      ? clamp((timelineDuration - localTime) / fadeOutDuration, 0, 1)
      : 1;

  return Math.min(fadeInGain, fadeOutGain);
};

export const useMediaPlayback = ({
  clips,
  currentTime,
  isPlaying,
  tracks,
}: {
  clips: TimelineClip[];
  currentTime: number;
  isPlaying: boolean;
  tracks: TimelineTrack[];
}) => {
  const mediaRefs = useRef<Record<string, HTMLMediaElement | null>>({});
  const gainNodesRef = useRef<Record<string, GainNode | null>>({});
  const sourceNodesRef = useRef<Record<string, MediaElementAudioSourceNode | null>>(
    {},
  );
  const sourceNodesByElementRef = useRef(
    new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>(),
  );
  const gainNodesByElementRef = useRef(new WeakMap<HTMLMediaElement, GainNode>());
  const audioGraphsRef = useRef<
    Array<{ sourceNode: MediaElementAudioSourceNode; gainNode: GainNode }>
  >([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tracksById = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks],
  );
  const soloTrackIds = useMemo(() => getSoloTrackIds(tracks), [tracks]);

  const isClipAudible = useCallback(
    (clip: TimelineClip) => {
      const track = tracksById.get(clip.trackId);
      if (!track) {
        return false;
      }
      return isTrackAudible(track, soloTrackIds) && !clip.isMuted;
    },
    [soloTrackIds, tracksById],
  );

  useEffect(
    () => () => {
      for (const graph of audioGraphsRef.current) {
        graph.sourceNode.disconnect();
        graph.gainNode.disconnect();
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    },
    [],
  );

  useEffect(() => {
    const activeClipIds = new Set(clips.map((clip) => clip.id));

    for (const clipId of Object.keys(mediaRefs.current)) {
      if (activeClipIds.has(clipId)) {
        continue;
      }

      const element = mediaRefs.current[clipId];
      if (element && !element.paused) {
        element.pause();
      }
      const gainNode = gainNodesRef.current[clipId];
      if (gainNode) {
        gainNode.gain.value = 0;
      }
      delete mediaRefs.current[clipId];
      delete sourceNodesRef.current[clipId];
      delete gainNodesRef.current[clipId];
    }
  }, [clips]);

  useEffect(() => {
    const ensureAudioGraph = (clipId: string, element: HTMLMediaElement) => {
      if (
        typeof window === 'undefined' ||
        typeof window.AudioContext === 'undefined'
      ) {
        return;
      }

      const existingSourceNode = sourceNodesByElementRef.current.get(element);
      const existingGainNode = gainNodesByElementRef.current.get(element);

      if (existingSourceNode && existingGainNode) {
        sourceNodesRef.current[clipId] = existingSourceNode;
        gainNodesRef.current[clipId] = existingGainNode;
        return;
      }

      const audioContext =
        audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = audioContext;

      const sourceNode = audioContext.createMediaElementSource(element);
      const gainNode = audioContext.createGain();

      sourceNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      sourceNodesByElementRef.current.set(element, sourceNode);
      gainNodesByElementRef.current.set(element, gainNode);
      audioGraphsRef.current.push({ sourceNode, gainNode });
      sourceNodesRef.current[clipId] = sourceNode;
      gainNodesRef.current[clipId] = gainNode;
    };

    for (const clip of clips) {
      const element = mediaRefs.current[clip.id];
      const sourceUrl = getClipSourceUrl(clip);
      if (!element || !sourceUrl) {
        continue;
      }

      ensureAudioGraph(clip.id, element);

      const fadeGain = getClipFadeGain(clip, currentTime);
      const nextGain = isClipAudible(clip)
        ? Math.max(0, (tracksById.get(clip.trackId)?.volume ?? 1) * clip.volume * fadeGain)
        : 0;
      const nextTime = getClipPlaybackPosition(clip, currentTime);
      const gainNode = gainNodesRef.current[clip.id];

      element.loop = false;
      element.playbackRate = getElementPlaybackRate(clip);
      element.volume = 1;
      element.muted = false;

      if (gainNode) {
        gainNode.gain.value = nextGain;
      } else {
        element.volume = clamp(nextGain, 0, 1);
      }

      if (nextTime === null) {
        if (!element.paused) {
          element.pause();
        }
        if (gainNode) {
          gainNode.gain.value = 0;
        } else {
          element.volume = 0;
        }
        continue;
      }

      const drift = Math.abs(element.currentTime - nextTime);
      if (!isPlaying || drift > 0.18) {
        element.currentTime = nextTime;
      }

      if (!isPlaying) {
        if (!element.paused) {
          element.pause();
        }
        continue;
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== 'running'
      ) {
        void audioContextRef.current.resume().catch(() => {
          // Ignore resume errors from browser autoplay policies.
        });
      }

      if (element.paused) {
        void element.play().catch(() => {
          // Ignore autoplay errors from browser autoplay policies.
        });
      }
    }
  }, [clips, currentTime, isClipAudible, isPlaying, tracksById]);

  const registerMediaElement = useCallback(
    (clipId: string, element: HTMLMediaElement | null) => {
      const previousElement = mediaRefs.current[clipId];

      if (previousElement === element) {
        return;
      }

      const previousGainNode = gainNodesRef.current[clipId];
      if (previousGainNode) {
        previousGainNode.gain.value = 0;
      }
      delete sourceNodesRef.current[clipId];
      delete gainNodesRef.current[clipId];
      mediaRefs.current[clipId] = element;
    },
    [],
  );

  return {
    getClipSourceUrl,
    isClipAudible,
    registerMediaElement,
  };
};
