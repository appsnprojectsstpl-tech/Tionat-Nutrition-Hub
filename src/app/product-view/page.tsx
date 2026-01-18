import { Suspense } from 'react';
import { ProductClient } from './product-client';
import { Metadata } from 'next';

type Props = {
    searchParams: { [key: string]: string | string[] | undefined }
}

async function getProduct(id: string) {
    if (!id) return null;
    // Using Firestore REST API for Server Side Fetching avoiding large SDK init
    // Format: https://firestore.googleapis.com/v1/projects/<PROJECT_ID>/databases/(default)/documents/products/<ID>
    // Assuming PROJECT_ID is 'tionat-backend' or similar. 
    // Actually, safer to just use default Metadata if I can't easily get Project ID env.
    // Speculation: Env vars usually have NEXT_PUBLIC_FIREBASE_PROJECT_ID

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return null;

    try {
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${id}`, { next: { revalidate: 60 } }); // Cache 60s
        if (!res.ok) return null;
        const data = await res.json();
        // Firestore REST returns fields in a specific format { fields: { name: { stringValue: "..." } } }
        // This parser is complex to write inline.
        // Simplified: extracting stringValue directly if possible.

        const fields = data.fields;
        return {
            name: fields?.name?.stringValue,
            description: fields?.description?.stringValue,
            metaTitle: fields?.metaTitle?.stringValue,
            metaDescription: fields?.metaDescription?.stringValue,
            imageUrl: fields?.imageUrl?.stringValue
        };
    } catch (e) {
        console.error("Metadata fetch failed", e);
        return null;
    }
}

export async function generateMetadata(
    { searchParams }: Props,
): Promise<Metadata> {
    const id = searchParams.id as string;
    const product = await getProduct(id);

    if (!product) {
        return {
            title: 'Product Details | Tionat',
        }
    }

    return {
        title: product.metaTitle || `${product.name} | Tionat`,
        description: product.metaDescription || product.description?.slice(0, 160),
        openGraph: {
            title: product.metaTitle || product.name,
            description: product.metaDescription || product.description?.slice(0, 160),
            images: product.imageUrl ? [product.imageUrl] : [],
        },
    }
}

export default function ProductViewPage({ searchParams }: Props) {
    // Pass searchParams to Client Component or just the ID
    // Note: searchParams is a promise in Next.js 15, but synchronous in 14. 
    // Assuming Next 14 based on syntax.

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Suspense fallback={<div className="p-8 text-center">Loading Product...</div>}>
                <ProductClient initialProduct={null} />
            </Suspense>
        </div>
    );
}
