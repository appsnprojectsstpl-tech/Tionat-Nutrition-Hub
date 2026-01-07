'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';

interface MultiImageUploadProps {
    value: string[];
    onChange: (urls: string[]) => void;
    disabled?: boolean;
}

export function MultiImageUpload({ value, onChange, disabled }: MultiImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const app = useFirebaseApp();
    const storage = app ? getStorage(app) : null;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !storage) return;

        setIsUploading(true);
        const newUrls: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // Create a unique filename: products/{timestamp}_{random}_{filename}
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(7);
                const filename = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const storageRef = ref(storage, `products/${timestamp}_${random}_${filename}`);

                // Upload
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                newUrls.push(url);
            }

            onChange([...(value || []), ...newUrls]);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = (urlToRemove: string) => {
        onChange(value.filter(url => url !== urlToRemove));
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(value || []).map((url, index) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-md border group">
                        <Image
                            fill
                            src={url}
                            alt={`Product Image ${index + 1}`}
                            className="object-cover"
                        />
                        <button
                            onClick={() => handleRemove(url)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                            type="button"
                            disabled={disabled}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}

                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg border-muted-foreground/25 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin mb-2" />
                        ) : (
                            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        )}
                        <span className="text-xs text-muted-foreground">
                            {isUploading ? "Uploading..." : "Add Image"}
                        </span>
                    </div>
                    <Input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                        disabled={disabled || isUploading}
                    />
                </label>
            </div>
            {(value || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Upload front, back, and detail shots.</p>
            )}
        </div>
    );
}
