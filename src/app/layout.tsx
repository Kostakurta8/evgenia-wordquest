import type { Metadata, Viewport } from "next";
import { Lora, Manrope } from "next/font/google";
import CloudSync from "@/components/CloudSync";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WordQuest — Задругата на думите",
  description:
    "Научи 1177 думи от „Задругата на пръстена“ — пътешествие през Средната земя на английския език.",
  applicationName: "WordQuest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4E9D0" },
    { media: "(prefers-color-scheme: dark)", color: "#171310" },
  ],
};

const themeBootstrap = `(function(){try{var t=localStorage.getItem("wq-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bg"
      className={`${lora.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col font-ui bg-page text-ink">
        <CloudSync />
        {children}
      </body>
    </html>
  );
}
