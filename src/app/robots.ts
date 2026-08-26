import { MetadataRoute } from 'next'

/**
 * @fileOverview توجيهات محركات البحث الصارمة لضمان الأرشفة الصحيحة ومنع الوصول للملفات الحساسة.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/dashboard/',
        '/api/',
        '/setup',
        '/login'
      ],
    },
    sitemap: 'https://optimalcp.org.ly/sitemap.xml',
  }
}
