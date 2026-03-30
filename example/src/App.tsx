import { useEffect, useMemo, useState } from 'react';
import {
  Editor,
  Preview,
  createClip,
  createTrack,
  type TimelineClip,
  type TimelineEditorBehavior,
  useTransport,
} from '@minijay/timeline';
import '@minijay/timeline/timeline.css';
import './app.css';
import {
  ExampleActionsBar,
  ExampleDebugPanel,
  ExampleIntro,
  ExamplePreviewSection,
  ExampleUploadedMediaSection,
} from './app/AppSections';
import { TransportMediaRack } from './app/TransportMediaRack';
import {
  BASE_DURATION,
  createWaveform,
  getClipEnd,
  initialTracks,
  trackHeader,
  videoPoster,
} from './app/timelineUtils';
import { useMediaUploads } from './app/useMediaUploads';

export default function App() {
  const [tracks, setTracks] = useState(initialTracks);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [nextTrackNumber, setNextTrackNumber] = useState(4);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const { isUploading, uploadMessage, handleFileUpload } = useMediaUploads({
    clips,
    setTracks,
    setClips,
    setSelectedClipIds,
  });

  const totalDuration = useMemo(() => {
    const furthestClipEnd = clips.reduce(
      (maxDuration, clip) => Math.max(maxDuration, getClipEnd(clip)),
      BASE_DURATION,
    );

    return Math.max(BASE_DURATION, Math.ceil(furthestClipEnd + 2));
  }, [clips]);

  const playbackEnd = useMemo(() => {
    if (clips.length === 0) {
      return totalDuration;
    }

    return clips.reduce(
      (maxDuration, clip) => Math.max(maxDuration, getClipEnd(clip)),
      0,
    );
  }, [clips, totalDuration]);

  const transport = useTransport({
    duration: totalDuration,
    playbackEnd,
    initialTime: 5.2,
  });

  const behavior = useMemo<TimelineEditorBehavior>(
    () => ({
      moveClip: ({ clip, nextTimelineStart, nextTrackId }) => {
        if (clip.id === 'music-bed') {
          return {
            trackId: 'music',
            timelineStart: Math.max(0, nextTimelineStart),
          };
        }

        return {
          trackId: nextTrackId,
          timelineStart: Math.max(0, nextTimelineStart),
        };
      },
      resizeClip: ({ clip, edge, nextTimelineDuration, nextTimelineStart }) => {
        if (clip.id !== 'music-bed') {
          return null;
        }

        if (edge === 'left') {
          return {
            timelineStart: nextTimelineStart,
            timelineDuration: Math.max(nextTimelineDuration ?? 0, 6),
          };
        }

        return {
          timelineDuration: Math.max(nextTimelineDuration ?? clip.timelineDuration, 6),
        };
      },
    }),
    [],
  );

  const uploadedClips = useMemo(
    () => clips.filter((clip) => Boolean(clip.cachedUrl ?? clip.originalUrl)),
    [clips],
  );

  const summary = useMemo(
    () =>
      clips.map((clip) => ({
        id: clip.id,
        trackId: clip.trackId,
        fillMode: clip.fillMode,
        mediaKind: clip.mediaKind,
        hasSource: Boolean(clip.cachedUrl ?? clip.originalUrl),
        timelineStart: Number(clip.timelineStart.toFixed(2)),
        timelineDuration: Number(clip.timelineDuration.toFixed(2)),
        sourceStart: Number(clip.sourceStart.toFixed(2)),
        sourceEnd: Number(clip.sourceEnd.toFixed(2)),
        sourceDuration: Number(clip.sourceDuration.toFixed(2)),
        thumbnailCount: clip.thumbnails?.length ?? 0,
      })),
    [clips],
  );

  useEffect(() => {
    setSelectedClipIds((currentIds) =>
      currentIds.filter((clipId) => clips.some((clip) => clip.id === clipId)),
    );
  }, [clips]);

  const addTrack = () => {
    const number = nextTrackNumber;
    const trackId = `layer-${number}`;
    const isLoopLane = number % 2 === 1;

    setNextTrackNumber(number + 1);
    setTracks((currentTracks) => [
      ...currentTracks,
      createTrack({
        id: trackId,
        name: `Layer ${number}`,
        category: isLoopLane ? 'Loop Lane' : 'Trim Lane',
        volume: 0.85,
      }),
    ]);
    setClips((currentClips) => [
      ...currentClips,
      createClip({
        id: `layer-clip-${number}`,
        trackId,
        name: `Layer ${number} Cue`,
        timelineStart: Math.min(number * 1.15, Math.max(totalDuration - 6, 0)),
        timelineDuration: isLoopLane ? 6 : undefined,
        sourceDuration: 3.5,
        sourceStart: 0,
        sourceEnd: 3.5,
        fillMode: isLoopLane ? 'loop' : 'trim',
        color: `hsl(${(number * 47) % 360} 72% 58%)`,
        mediaKind: number % 2 === 0 ? 'audio' : 'video',
        posterUrl: number % 2 === 0 ? undefined : videoPoster,
        waveform: createWaveform(number + 2),
      }),
    ]);
  };

  const removeLastTrack = () => {
    setTracks((currentTracks) => {
      const lastTrack = currentTracks.at(-1);
      if (!lastTrack) {
        return currentTracks;
      }

      setClips((currentClips) =>
        currentClips.filter((clip) => clip.trackId !== lastTrack.id),
      );

      return currentTracks.slice(0, -1);
    });
  };

  const handleSelectClip = (clipId: string) => {
    const clip = clips.find((item) => item.id === clipId);
    if (!clip) {
      return;
    }

    setSelectedClipIds([clipId]);
    transport.seek(clip.timelineStart);
  };

  return (
    <main className="example-shell">
      <ExampleIntro />
      <ExampleActionsBar
        isUploading={isUploading}
        trackCount={tracks.length}
        clipCount={clips.length}
        uploadedCount={uploadedClips.length}
        totalDuration={totalDuration}
        onFileUpload={handleFileUpload}
        onAddTrack={addTrack}
        onRemoveLastTrack={removeLastTrack}
      />

      {uploadMessage ? <p className="example-uploadMessage">{uploadMessage}</p> : null}

      <ExamplePreviewSection>
        <Preview
          clips={clips}
          currentTime={transport.currentTime}
          isPlaying={transport.isPlaying}
          tracks={tracks}
        />
      </ExamplePreviewSection>

      <section className="example-stage">
        <Editor
          tracks={tracks}
          clips={clips}
          currentTime={transport.currentTime}
          totalDuration={totalDuration}
          isPlaying={transport.isPlaying}
          behavior={behavior}
          emptyState={
            <div>
              No tracks yet. Add a track or upload media to start editing.
            </div>
          }
          renderTrackHeader={trackHeader}
          selectedClipIds={selectedClipIds}
          onSelectedClipIdsChange={setSelectedClipIds}
          onTracksChange={setTracks}
          onClipsChange={setClips}
          onSeek={transport.seek}
          onPlay={transport.play}
          onPause={transport.pause}
          onStop={transport.stop}
        />
      </section>

      <ExampleUploadedMediaSection>
        <TransportMediaRack
          clips={uploadedClips}
          selectedClipIds={selectedClipIds}
          tracks={tracks}
          onSelectClip={handleSelectClip}
        />
      </ExampleUploadedMediaSection>

      <ExampleDebugPanel tracks={tracks} summary={summary} />
    </main>
  );
}
