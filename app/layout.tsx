import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const siteUrl = new URL(process.env.SITE_URL ?? 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: 'GPU Signal Atlas',
  description: 'Citation-first RAG for NVIDIA Xid events and DCGM telemetry.',
  openGraph: {
    title: 'GPU Signal Atlas',
    description: 'Citation-first RAG for GPU telemetry.',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'GPU Signal Atlas telemetry visualization' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GPU Signal Atlas',
    description: 'Citation-first RAG for GPU telemetry.',
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
