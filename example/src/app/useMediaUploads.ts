import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  createClip,
  createTrack,
  type TimelineClip,
  type TimelineTrack,
} from '@minijay/timeline';
import {
  isPlayableMediaFile,
  loadMediaAsset,
  UPLOAD_AUDIO_TRACK_ID,
  UPLOAD_GAP,
  UPLOAD_VIDEO_TRACK_ID,
} from './media';
import { getTrackTailTime } from './timelineUtils';

type UseMediaUploadsArgs = {
  clips: TimelineClip[];
  setTracks: Dispatch<SetStateAction<TimelineTrack[]>>;
  setClips: Dispatch<SetStateAction<TimelineClip[]>>;
  setSelectedClipIds: Dispatch<SetStateAction<string[]>>;
};

export const useMediaUploads = ({
  clips,
  setTracks,
  setClips,
  setSelectedClipIds,
}: UseMediaUploadsArgs) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const nextUploadNumberRef = useRef(1);

  useEffect(
    () => () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    const activeUrls = new Set<string>();

    for (const clip of clips) {
      for (const candidate of [clip.originalUrl, clip.cachedUrl, clip.posterUrl]) {
        if (candidate?.startsWith('blob:')) {
          activeUrls.add(candidate);
        }
      }
    }

    for (const url of Array.from(objectUrlsRef.current)) {
      if (activeUrls.has(url)) {
        continue;
      }

      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, [clips]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const mediaFiles = files.filter(isPlayableMediaFile);
    if (mediaFiles.length === 0) {
      setUploadMessage('audio/video 파일만 업로드할 수 있습니다.');
      return;
    }

    setIsUploading(true);
    setUploadMessage(
      mediaFiles.length === files.length
        ? null
        : '지원하지 않는 파일은 제외하고 업로드했습니다.',
    );

    try {
      const loadedAssets = await Promise.all(
        mediaFiles.map((file) =>
          loadMediaAsset(
            file,
            `upload-${nextUploadNumberRef.current++}`,
            objectUrlsRef.current,
          ),
        ),
      );

      setTracks((currentTracks) => {
        const nextTracks = [...currentTracks];

        if (
          loadedAssets.some((asset) => asset.mediaKind === 'audio') &&
          !nextTracks.some((track) => track.id === UPLOAD_AUDIO_TRACK_ID)
        ) {
          nextTracks.push(
            createTrack({
              id: UPLOAD_AUDIO_TRACK_ID,
              name: 'Uploads Audio',
              category: 'Imported',
              volume: 1,
            }),
          );
        }

        if (
          loadedAssets.some((asset) => asset.mediaKind === 'video') &&
          !nextTracks.some((track) => track.id === UPLOAD_VIDEO_TRACK_ID)
        ) {
          nextTracks.push(
            createTrack({
              id: UPLOAD_VIDEO_TRACK_ID,
              name: 'Uploads Video',
              category: 'Imported',
              volume: 1,
            }),
          );
        }

        return nextTracks;
      });

      setClips((currentClips) => {
        const nextClips = [...currentClips];

        for (const asset of loadedAssets) {
          const targetTrackId =
            asset.mediaKind === 'video' ? UPLOAD_VIDEO_TRACK_ID : UPLOAD_AUDIO_TRACK_ID;
          const timelineStart = getTrackTailTime(nextClips, targetTrackId);

          nextClips.push(
            createClip({
              id: asset.id,
              trackId: targetTrackId,
              name: asset.name,
              timelineStart:
                timelineStart === 0 ? 0 : Number((timelineStart + UPLOAD_GAP).toFixed(2)),
              sourceDuration: asset.sourceDuration,
              sourceStart: 0,
              sourceEnd: asset.sourceDuration,
              fillMode: 'trim',
              color: asset.color,
              mediaKind: asset.mediaKind,
              originalUrl: asset.originalUrl,
              cachedUrl: asset.cachedUrl,
              posterUrl: asset.posterUrl,
              thumbnails: asset.thumbnails,
            }),
          );
        }

        return nextClips;
      });

      const lastAsset = loadedAssets.at(-1);
      if (lastAsset) {
        setSelectedClipIds([lastAsset.id]);
        setUploadMessage(`${loadedAssets.length}개의 media clip을 추가했습니다.`);
      }
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadMessage,
    handleFileUpload,
  };
};
