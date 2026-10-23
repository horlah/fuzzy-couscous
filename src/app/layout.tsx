import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
    title: 'Lance Ops · Housekeeping MVP',
    description: 'A faster room board for housekeepers, with two-tap issue reporting.',
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Lance Ops' },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    interactiveWidget: 'resizes-content',
    themeColor: '#fafafa',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>{children}</body>
        </html>
    );
}
