import { MetadataRoute } from 'next'

/**
 * @fileOverview توليد خارطة الموقع التلقائية لمساعدة Google على اكتشاف المنهج والمسائل والمنتدى.
 * تم تحديث الرابط للنطاق الجديد org.ly
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://optimalcp.org.ly'

  // الصفحات الثابتة الأساسية
  const staticRoutes = [
    '',
    '/problems',
    '/forum',
    '/leaderboard',
    '/terms',
    '/privacy',
    '/licenses',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  return [...staticRoutes]
}
