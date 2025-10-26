import type { Metadata } from "next";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";
import Sidebar from "@/components/sidebar";
import { Suspense } from "react";

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
    <html className="h-full overscroll-none" lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${garamond.variable} h-full antialiased`}
      >
        <Providers>
          <div className="grid size-full grid-rows-[auto_1fr]">
            <Header />
            <div className="grid size-full grid-cols-[auto_1fr]">
              <Suspense><Sidebar /></Suspense>
              <div className="flex h-full flex-col">
                <div className="-mt-16 h-0 grow overflow-scroll pt-16">
                  <Suspense>{children}</Suspense>
                </div>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
