import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { ToastProvider } from '@/components/ui/toast';
import { Navbar } from '@/components/layout/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Campus Canteen',
  description: 'Order food, track orders, and earn loyalty points',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-6">{children}</main>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
