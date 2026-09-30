import Navbar from '@/components/Navbar';
import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { ADSENSE_CLIENT } from '@/lib/adsense';

export const metadata: Metadata = {
  title: 'FunFriday | Multiplayer Quizzes, Wordle Rush & Sudoku',
  description:
    'Play multiplayer cricket quizzes, football quizzes, Bollywood quizzes, WWE quizzes, Wordle Rush, and Sudoku with friends on FunFriday.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <Script
          id="funfriday-adsense"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-slate-950 min-h-full flex flex-col text-white m-0 p-0">
        <Navbar />
        {/* This wrapper captures exactly 100% of the remaining viewport space */}
        <div className="flex-1 flex flex-col min-h-0 relative w-full">
          {children}
        </div>
      </body>
    </html>
  );
}
