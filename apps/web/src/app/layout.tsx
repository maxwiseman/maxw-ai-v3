import type { Metadata } from "next";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

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
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${garamond.variable} antialiased h-full`}
      >
        <Providers>
          <div className="grid grid-rows-[auto_1fr] size-full">
            <Header />
            <div className="grid grid-cols-[auto_1fr] size-full">
              <Sidebar />
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
