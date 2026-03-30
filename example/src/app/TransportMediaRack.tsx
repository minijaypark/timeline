import { useMemo } from 'react';
import { type TimelineClip, type TimelineTrack } from '@minijay/timeline';
import { getClipEnd } from './timelineUtils';

type TransportMediaRackProps = {
  clips: TimelineClip[];
  selectedClipIds: string[];
  tracks: TimelineTrack[];
  onSelectClip: (clipId: string) => void;
};

export const TransportMediaRack = ({
  clips,
  selectedClipIds,
  tracks,
  onSelectClip,
}: TransportMediaRackProps) => {
  const tracksById = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks],
  );

  if (clips.length === 0) {
    return (
      <div className="example-uploadEmpty">
        <strong>No uploaded media yet</strong>
        <span>audio/video 파일을 올리면 source 카드와 preview viewer에서 바로 확인할 수 있습니다.</span>
      </div>
    );
  }

  return (
    <div className="example-mediaGrid">
      {clips.map((clip) => {
        const sourceUrl = clip.cachedUrl ?? clip.originalUrl;
        const track = tracksById.get(clip.trackId);
        const selected = selectedClipIds.includes(clip.id);

        if (!sourceUrl) {
          return null;
        }

        return (
          <article
            key={clip.id}
            className="example-mediaCard"
            data-selected={selected}
            onClick={() => onSelectClip(clip.id)}
          >
            <div className="example-mediaHeader">
              <div>
                <strong>{clip.name}</strong>
                <span>
                  {clip.mediaKind === 'video' ? 'Video' : 'Audio'} · {track?.name ?? clip.trackId}
                </span>
              </div>
              <div className="example-mediaBadges">
                {selected ? <span className="example-badge">Selected</span> : null}
                <span className="example-badge">Source</span>
              </div>
            </div>
            {clip.mediaKind === 'video' ? (
              <video
                className="example-video"
                controls
                playsInline
                poster={clip.posterUrl}
                preload="metadata"
                src={sourceUrl}
              />
            ) : (
              <audio
                className="example-audio"
                controls
                preload="metadata"
                src={sourceUrl}
              />
            )}
            <div className="example-mediaFooter">
              <span>
                timeline {clip.timelineStart.toFixed(2)}s - {getClipEnd(clip).toFixed(2)}s
              </span>
              <span>source {clip.sourceDuration.toFixed(2)}s</span>
            </div>
          </article>
        );
      })}
    </div>
  );
};
