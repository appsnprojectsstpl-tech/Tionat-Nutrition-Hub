'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const app = useFirebaseApp();
    const storage = app ? getStorage(app) : null;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storage) return;

        setIsUploading(true);
        try {
            // Create a unique filename: products/{timestamp}_{random}_{filename}
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const filename = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const storageRef = ref(storage, `products/${timestamp}_${random}_${filename}`);

            // Upload
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            onChange(url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        onChange('');
    };

    return (
        <div className="space-y-4 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:bg-muted/50 transition-colors">
            {value ? (
                <div className="relative aspect-square w-40 h-40 overflow-hidden rounded-md border">
                    <Image
                        fill
                        src={value}
                        alt="Product Image"
                        className="object-cover"
                    />
                    <button
                        onClick={handleRemove}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        type="button"
                        disabled={disabled}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                        ) : (
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        )}
                        <p className="text-sm text-muted-foreground">
                            {isUploading ? "Uploading..." : "Click to upload image"}
                        </p>
                    </div>
                    <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={disabled || isUploading}
                    />
                </label>
            )}
        </div>
    );
}
