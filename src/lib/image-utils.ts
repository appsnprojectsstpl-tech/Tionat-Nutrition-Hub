/**
 * Compresses an image file using the browser's native Canvas API.
 * Resizes the image to fit within maxWidth/maxHeight while maintaining aspect ratio,
 * and converts it to WebP/JPEG with reduced quality.
 */
export async function compressImage(
    file: File,
    maxWidth: number = 1000,
    maxHeight: number = 1000,
    quality: number = 0.8
): Promise<File> {
    // 1. Validate File
    if (!file.type.startsWith('image/')) {
        return file; // Pass through non-images
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                // 2. Calculate Dimensions
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                // 3. Draw to Canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file); // Fail gracefully
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // 4. Export Blob
                // Prefer WebP for size, fallback to JPEG
                const mimeType = 'image/webp';
                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }

                    // Create new File
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                        type: mimeType,
                        lastModified: Date.now(),
                    });

                    resolve(newFile);
                }, mimeType, quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
