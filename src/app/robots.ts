import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/menu', '/order', '/about', '/contact'],
        disallow: ['/pos', '/pos/', '/admin', '/admin/', '/kitchen', '/kitchen/', '/print', '/print/'],
      },
    ],
    sitemap: 'https://www.khaasdaan.pk/sitemap.xml',
  };
}