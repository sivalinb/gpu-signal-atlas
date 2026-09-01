import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const siteUrl = new URL(process.env.SITE_URL ?? 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'GPU Signal Atlas | GPU observability and performance intelligence',
  description: 'Evidence-first GPU observability, benchmark comparison, SLO guidance, and capacity planning for NVIDIA telemetry.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'GPU Signal Atlas | Performance intelligence',
    description: 'GPU telemetry, benchmark evidence, SLO decisions, and capacity planning in one explainable system.',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'GPU Signal Atlas telemetry visualization' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GPU Signal Atlas | Performance intelligence',
    description: 'GPU telemetry, benchmark evidence, SLO decisions, and capacity planning in one explainable system.',
    images: ['/og.jpg'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
