import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Geist_Mono, Nunito_Sans, Rubik } from 'next/font/google';

import { AuthHeader } from '@/components/auth-header';
import ConvexClientProvider from '@/components/convex-clerk-provider';
import { cn } from '@/lib/utils';

import './globals.css';

const bodyFont = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const headingFont = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-display',
  display: 'swap',
});

const monoFont = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FreshCart',
    template: '%s | FreshCart',
  },
  description: 'Fresh groceries delivered straight to your door.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      className={cn(
        'h-full antialiased',
        bodyFont.variable,
        headingFont.variable,
        monoFont.variable,
      )}
    >
      <body className='flex min-h-full flex-col'>
        <ClerkProvider>
          <ConvexClientProvider>
            <AuthHeader />
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
