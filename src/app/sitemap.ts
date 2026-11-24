import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.khaasdaan.pk';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicRoutes = [
    { path: '/', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/menu', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/order', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
  ];

  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}