/**
 * Image Compression Utility
 * Compresses images before uploading to Firebase Storage to save bandwidth and storage costs
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-1
    targetSizeKB?: number; // Target file size in KB
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    targetSizeKB: 200, // Target 200KB for product images
};

/**
 * Compress an image file to reduce size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed image as File
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // If file is already small enough, return as-is
    if (file.size / 1024 < (opts.targetSizeKB || 200)) {
        console.log(`✅ Image already optimized: ${(file.size / 1024).toFixed(2)}KB`);
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > (opts.maxWidth || 1200) || height > (opts.maxHeight || 1200)) {
                    const ratio = Math.min(
                        (opts.maxWidth || 1200) / width,
                        (opts.maxHeight || 1200) / height
                    );
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob with compression
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }

                        const originalSizeKB = file.size / 1024;
                        const compressedSizeKB = blob.size / 1024;
                        const savings = ((1 - blob.size / file.size) * 100).toFixed(1);

                        console.log(`📸 Image compressed: ${originalSizeKB.toFixed(2)}KB → ${compressedSizeKB.toFixed(2)}KB (${savings}% smaller)`);

                        // Create new file from blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });

                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    opts.quality || 0.8
                );
            };
            img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
    });
}

/**
 * Compress multiple images
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Array of compressed images
 */
export async function compressImages(
    files: File[],
    options: CompressionOptions = {}
): Promise<File[]> {
    const compressed = await Promise.all(
        files.map((file) => compressImage(file, options))
    );

    const totalOriginal = files.reduce((sum, f) => sum + f.size, 0) / 1024;
    const totalCompressed = compressed.reduce((sum, f) => sum + f.size, 0) / 1024;
    const savings = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);

    console.log(`📦 Batch compression: ${totalOriginal.toFixed(2)}KB → ${totalCompressed.toFixed(2)}KB (${savings}% smaller)`);

    return compressed;
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

/**
 * Get optimal compression settings based on image type
 */
export function getOptimalSettings(imageType: 'product' | 'banner' | 'profile'): CompressionOptions {
    switch (imageType) {
        case 'product':
            return {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.85,
                targetSizeKB: 200,
            };
        case 'banner':
            return {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.9,
                targetSizeKB: 300,
            };
        case 'profile':
            return {
                maxWidth: 400,
                maxHeight: 400,
                quality: 0.8,
                targetSizeKB: 100,
            };
        default:
            return DEFAULT_OPTIONS;
    }
}
