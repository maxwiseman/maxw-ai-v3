import type { Metadata } from "next";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Header from "@/components/header";
import Providers from "@/components/providers";
import Sidebar from "@/components/sidebar";
import "../index.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "maxw-ai-v3",
  description: "maxw-ai-v3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="h-full overflow-x-hidden overflow-y-hidden overscroll-none"
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${garamond.variable} h-full overflow-x-hidden antialiased`}
      >
        <Providers>
          <div className="grid size-full grid-rows-[auto_1fr]">
            <Suspense fallback={<div className="h-16" />}>
              <Header />
            </Suspense>
            <div className="grid size-full md:grid-cols-[auto_1fr]">
              <Suspense fallback={<div />}>
                <div className="hidden md:contents">
                  <Sidebar />
                </div>
              </Suspense>
              <div className="flex h-full flex-col">
                <div className="-mt-16 h-0 grow overflow-scroll pt-16">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
