/**
 * Fast Client-Side Thumbnail Generator & Dimension Inspector
 * Generates lightweight, instant base64 thumbnails for images and videos.
 */

export interface MediaMeta {
  width: number;
  height: number;
  aspectRatio: number;
  thumbnailUrl: string;
}

/**
 * Generate a fast compressed thumbnail (WebP / JPEG base64) and measure image dimensions
 */
export async function generateImageThumbnail(file: Blob, maxDim = 480): Promise<MediaMeta> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const origW = img.naturalWidth || 1920;
        const origH = img.naturalHeight || 1080;
        const aspectRatio = origW / Math.max(1, origH);

        let targetW = origW;
        let targetH = origH;

        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetW = maxDim;
            targetH = Math.round(maxDim / aspectRatio);
          } else {
            targetH = maxDim;
            targetW = Math.round(maxDim * aspectRatio);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          URL.revokeObjectURL(objectUrl);
          resolve({
            width: origW,
            height: origH,
            aspectRatio,
            thumbnailUrl: dataUrl,
          });
          return;
        }
      } catch (err) {
        console.warn('Canvas thumbnail error:', err);
      }

      URL.revokeObjectURL(objectUrl);
      resolve({
        width: 1920,
        height: 1080,
        aspectRatio: 1.77,
        thumbnailUrl: objectUrl,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: 1920,
        height: 1080,
        aspectRatio: 1.77,
        thumbnailUrl: '',
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Capture first frame of a video file for an instant card thumbnail
 */
export async function generateVideoThumbnail(file: Blob, maxDim = 480): Promise<MediaMeta> {
  return new Promise((resolve) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0.5;
    video.preload = 'metadata';

    const cleanUpAndFallback = () => {
      URL.revokeObjectURL(videoUrl);
      resolve({
        width: 1920,
        height: 1080,
        aspectRatio: 16 / 9,
        thumbnailUrl: '',
      });
    };

    const timer = setTimeout(() => {
      cleanUpAndFallback();
    }, 4000);

    video.onloadedmetadata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      clearTimeout(timer);
      try {
        const origW = video.videoWidth || 1920;
        const origH = video.videoHeight || 1080;
        const aspectRatio = origW / Math.max(1, origH);

        let targetW = origW;
        let targetH = origH;

        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetW = maxDim;
            targetH = Math.round(maxDim / aspectRatio);
          } else {
            targetH = maxDim;
            targetW = Math.round(maxDim * aspectRatio);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          URL.revokeObjectURL(videoUrl);
          resolve({
            width: origW,
            height: origH,
            aspectRatio,
            thumbnailUrl: dataUrl,
          });
          return;
        }
      } catch (err) {
        console.warn('Video thumbnail capture error:', err);
      }

      cleanUpAndFallback();
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanUpAndFallback();
    };
  });
}
