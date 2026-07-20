import './globals.css';
import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'AI App Planner',
  description: 'Plan your software architecture and roadmap with Claude API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="flex flex-col min-height-screen">
        <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900">
              <span className="bg-sky-600 text-white px-2.5 py-1 rounded-lg text-sm">AI</span>
              App Planner
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/projects" className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">
                Proyek Saya
              </Link>
              <Link href="/plan" className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">
                Proyek Baru
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t bg-slate-50 py-6 text-center text-slate-500 text-xs">
          <p>© {new Date().getFullYear()} AI App Planner. Menggunakan Claude 3.5/4 API untuk arsitektur software praktis.</p>
        </footer>
      </body>
    </html>
  );
}
