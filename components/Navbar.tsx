// Navbar.tsx
"use client";
import Link from 'next/link';
import Image from 'next/image';
import { QUIZ_PAGES } from '@/lib/quiz-pages';
import GoogleSignIn from '@/components/GoogleSignIn';

export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-[#0a0a0b]/95 shadow-lg shadow-black/20 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="FunFriday home"
          className="shrink-0 transition-transform hover:scale-105 active:scale-95"
        >
          <Image
            src="/logo.png"
            alt="FunFriday"
            width={70}
            height={70}
            className="h-auto w-11 drop-shadow-2xl sm:w-14"
            priority
          />
        </Link>

        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-1 sm:justify-center sm:gap-2">
            {QUIZ_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/${page.slug}`}
                className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide text-zinc-300 transition-colors hover:bg-white/10 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:text-[11px]"
              >
                {page.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="hidden shrink-0 sm:block">
          <GoogleSignIn />
        </div>
      </div>
    </nav>
  );
}
