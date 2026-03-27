import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TimelineTrack, TimelineVideoInfo } from '../types';

export const TimelineTrackHeaders = ({
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  readOnly,
  tracks,
  video,
}: {
  onTrackMute: (trackId: string) => void;
  onTrackSolo: (
    event: ReactPointerEvent<HTMLButtonElement>,
    trackId: string,
  ) => void;
  onTrackVolume: (trackId: string, value: number) => void;
  readOnly: boolean;
  tracks: TimelineTrack[];
  video?: TimelineVideoInfo | null;
}) => (
  <div className="tl-trackHeaders">
    {video ? <div className="tl-videoHeader">{video.name}</div> : null}
    {tracks.map((track) => (
      <div key={track.id} className="tl-trackHeader">
        <div className="tl-trackName">{track.name}</div>
        <input
          className="tl-trackVolume"
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={track.volume ?? 1}
          onChange={(event) =>
            onTrackVolume(track.id, Number.parseFloat(event.target.value))
          }
          disabled={readOnly}
        />
        <div className="tl-trackActions">
          <button
            className="tl-trackToggle"
            data-active={track.isSolo === true}
            onPointerDown={(event) => onTrackSolo(event, track.id)}
            type="button"
          >
            S
          </button>
          <button
            className="tl-trackToggle"
            data-active={track.isMuted === true}
            onClick={() => onTrackMute(track.id)}
            type="button"
          >
            M
          </button>
        </div>
      </div>
    ))}
  </div>
);
