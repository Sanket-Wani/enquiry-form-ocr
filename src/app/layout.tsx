import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vishal Chugera Properties | Enquiry Form OCR & CRM Digitizer",
  description:
    "Enterprise physical enquiry form digitization, OCR review, human verification, and dual CRM persistence powered by Sarvam DocAI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-neutral-900 selection:bg-neutral-200">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-neutral-200 bg-white py-4 text-center text-xs text-neutral-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>
              &copy; 2026 Vishal Chugera Properties India Pvt. Ltd. &bull; Pioneers in Collector N.A. Plots
            </span>
            <span className="text-[11px] text-neutral-400">
              Sarvam DocAI Integration &bull; Internal Business System
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
