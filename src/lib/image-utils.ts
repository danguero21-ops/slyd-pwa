/**
 * Compresses an image from a Data URL or File to a smaller size and JPEG format.
 * @param input The original image data URL or File object.
 * @param maxWidth The maximum width of the resulting image.
 * @param quality The quality of the JPEG compression (0.0 to 1.0).
 * @returns A promise that resolves to the compressed data URL.
 */
export async function compressImage(
  input: string | File, 
  maxWidth: number = 500, 
  quality: number = 0.65
): Promise<string> {
  let dataUrl: string;

  if (typeof input !== 'string') {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image as data URL'));
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(input);
    });
  } else {
    dataUrl = input;
  }

  return new Promise((resolve) => {
    // If it's already a tiny svg or invalid dataUrl, return directly
    if (dataUrl.startsWith('data:image/svg') || dataUrl.startsWith('http')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width || 500;
        let height = img.height || 500;

        // Calculate new dimensions keeping aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl); // fallback to original dataUrl if context unavailable
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with specified quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Canvas compression fallback to original data:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      // If image loading fails, gracefully fallback to the original dataUrl
      console.warn('Image element failed to load; using raw dataUrl fallback');
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
