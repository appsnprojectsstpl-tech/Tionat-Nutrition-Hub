import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://tionat.com';

    // Static routes
    const routes = [
        '',
        '/search',
        '/cart',
        '/profile',
        '/policy/privacy',
        '/policy/terms',
        '/policy/refund',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Ideally we fetch products here and add them, but strictly client-side fetching in build is tricky.
    // We will stick to static routes for now.

    return routes;
}
