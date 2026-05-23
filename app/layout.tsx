import Navbar from '@/components/Navbar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950">
        <Navbar />
        {/* The rest of your pages will render here */}
        {children}
      </body>
    </html>
  );
}