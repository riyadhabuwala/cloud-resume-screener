import { Inter } from 'next/font/google';
import './globals.css';

// Use Inter as requested for a clean, professional SaaS look.
const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Resume Screener',
  description: 'Screen resume PDFs against a job description using AI.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
