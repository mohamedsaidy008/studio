import './globals.css';
import { MaintenanceGuard } from '@/components/guards/MaintenanceGuard';
import { SetupGuard } from '@/components/guards/SetupGuard';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "أتقن البرمجة التنافسية | OptimalCP | أوبتيمال سي بي",
    template: "%s | OptimalCP"
  },
  description: "المنصة العربية الأولى المتخصصة في تدريب المبرمجين على الخوارزميات والبرمجة التنافسية. اتبع خارطة طريق أكاديمية محكمة مع أوبتيمال سي بي (OptimalCP)، حل مسائل كودفورسز، وارتقِ بمستواك العالمي.",
  keywords: ["برمجة", "خوارزميات", "برمجة تنافسية", "كودفورسز", "Codeforces", "Competitive Programming", "Algorithms", "تعلم البرمجة", "ليبيا", "أتقن البرمجة التنافسية", "أوبتيمال سي بي", "optimalcp", "optimal cp"],
  authors: [{ name: "Artiatech Studio", url: "https://artiatech.ly" }],
  creator: "Artiatech Studio",
  publisher: "Artiatech Studio",
  metadataBase: new URL('https://optimalcp.org.ly'),
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "أتقن البرمجة التنافسية | OptimalCP | أوبتيمال سي بي",
    description: "انضم لأكبر مجتمع عربي لتعلم الخوارزميات وبنى المعطيات بأسلوب أكاديمي محكم مع أوبتيمال سي بي. أتقن البرمجة التنافسية الآن.",
    url: "https://optimalcp.org.ly",
    siteName: "OptimalCP",
    locale: "ar_LY",
    type: "website",
    images: [{ url: 'https://optimalcp.org.ly/og-image.png', width: 1200, height: 630, alt: 'OptimalCP Platform' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "أتقن البرمجة التنافسية | OptimalCP | أوبتيمال سي بي",
    description: "المنصة الأكاديمية الأولى لتدريب المبرمجين العرب على الخوارزميات والبرمجة التنافسية.",
    creator: "@artiatechstudio",
    images: ['https://optimalcp.org.ly/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cinzel:wght@600;700;900&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased font-body min-h-screen bg-[#fcf9f2] text-[#2c241b]">
        <MaintenanceGuard>
          <SetupGuard>
            {children}
          </SetupGuard>
        </MaintenanceGuard>
        <Toaster />
      </body>
    </html>
  );
}
