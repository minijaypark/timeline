import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import type {
  TimelineTrack,
  TimelineTrackHeaderRenderArgs,
  TimelineVideoInfo,
} from '../types';

const renderDefaultTrackHeader = ({
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  readOnly,
  track,
}: {
  onTrackMute: (trackId: string) => void;
  onTrackSolo: (
    event: ReactPointerEvent<HTMLButtonElement>,
    trackId: string,
  ) => void;
  onTrackVolume: (trackId: string, value: number) => void;
  readOnly: boolean;
  track: TimelineTrack;
}) => (
  <>
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
  </>
);

export const TrackHeaders = ({
  onTrackMute,
  onTrackSolo,
  onTrackVolume,
  readOnly,
  renderTrackHeader,
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
  renderTrackHeader?: (args: TimelineTrackHeaderRenderArgs) => ReactNode;
  tracks: TimelineTrack[];
  video?: TimelineVideoInfo | null;
}) => (
  <div className="tl-trackHeaders">
    {video ? <div className="tl-videoHeader">{video.name}</div> : null}
    {tracks.map((track) => {
      const defaultContent = renderDefaultTrackHeader({
        onTrackMute,
        onTrackSolo,
        onTrackVolume,
        readOnly,
        track,
      });

      return (
        <div key={track.id} className="tl-trackHeader">
          {renderTrackHeader
            ? renderTrackHeader({
                track,
                isReadOnly: readOnly,
                defaultContent,
              })
            : defaultContent}
        </div>
      );
    })}
  </div>
);
