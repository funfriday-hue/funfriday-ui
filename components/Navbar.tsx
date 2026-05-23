"use client";
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 p-6 z-[100]">
      <Link href="/" className="transition-transform hover:scale-105 active:scale-95 block">
        <Image 
          src="/logo.png" 
          alt="FunFriday Logo" 
          width={120}  // Adjust size as needed
          height={120}
          className="drop-shadow-2xl"
          priority // Ensures the logo loads immediately
        />
      </Link>
    </nav>
  );
}