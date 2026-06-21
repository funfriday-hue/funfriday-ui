// Navbar.tsx
"use client";
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    // Changed p-6 to p-4 to move it closer to the corner
    <nav className="fixed top-0 left-0 p-4 z-[100] pointer-events-none">
      <Link href="/" className="transition-transform hover:scale-105 active:scale-95 block pointer-events-auto">
        <Image 
          src="/logo.png" 
          alt="FunFriday Logo" 
          width={70}  // Reduced base width for desktop/mobile optimization
          height={70}
          className="drop-shadow-2xl w-[65px] md:w-[90px] h-auto" 
          priority 
        />
      </Link>
    </nav>
  );
}