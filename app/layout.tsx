import Navbar from '@/components/Navbar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
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