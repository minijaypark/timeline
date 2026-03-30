import {
  type TimelineClipMediaKind,
} from '@minijay/timeline';

export const UPLOAD_GAP = 0.4;
export const UPLOAD_AUDIO_TRACK_ID = 'uploads-audio';
export const UPLOAD_VIDEO_TRACK_ID = 'uploads-video';

const getBaseName = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '') || fileName;

const hashToColor = (seed: string) => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }

  return `hsl(${hash} 70% 56%)`;
};

export const isPlayableMediaFile = (file: File) =>
  file.type.startsWith('audio/') || file.type.startsWith('video/');

const getMediaKindFromFile = (file: File): TimelineClipMediaKind =>
  file.type.startsWith('video/') ? 'video' : 'audio';

const captureVideoPoster = (video: HTMLVideoElement) => {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return undefined;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
};

export type LoadedMediaAsset = {
  id: string;
  mediaKind: TimelineClipMediaKind;
  name: string;
  originalUrl: string;
  cachedUrl: string;
  posterUrl?: string;
  sourceDuration: number;
  color: string;
};

export const loadMediaAsset = async (
  file: File,
  clipId: string,
  ownedUrls: Set<string>,
): Promise<LoadedMediaAsset> => {
  const mediaKind = getMediaKindFromFile(file);
  const url = URL.createObjectURL(file);
  ownedUrls.add(url);

  const metadata = await new Promise<{
    duration: number;
    posterUrl?: string;
  }>((resolve, reject) => {
    const handleError = () => {
      reject(new Error(`${file.name} metadata를 읽을 수 없습니다.`));
    };

    if (mediaKind === 'video') {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      const cleanup = () => {
        video.onloadeddata = null;
        video.onerror = null;
      };

      video.onloadeddata = async () => {
        cleanup();

        try {
          const duration = Number.isFinite(video.duration) ? video.duration : 0;
          const posterUrl = captureVideoPoster(video);

          resolve({
            duration,
            posterUrl,
          });
        } catch {
          handleError();
        }
      };
      video.onerror = () => {
        cleanup();
        handleError();
      };

      return;
    }

    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;

    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
    };

    audio.onloadedmetadata = () => {
      cleanup();
      resolve({
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };
    audio.onerror = () => {
      cleanup();
      handleError();
    };
  }).catch((error) => {
    URL.revokeObjectURL(url);
    ownedUrls.delete(url);
    throw error;
  });

  return {
    id: clipId,
    mediaKind,
    name: getBaseName(file.name),
    originalUrl: url,
    cachedUrl: url,
    posterUrl: metadata.posterUrl,
    sourceDuration: Math.max(metadata.duration, 0.01),
    color: hashToColor(`${file.name}-${file.size}`),
  };
};
