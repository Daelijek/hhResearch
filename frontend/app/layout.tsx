import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://hhresearch.local"),
  title: {
    default: "hhResearch | HH vacancy analysis to Excel",
    template: "%s | hhResearch",
  },
  description:
    "Analyze HH vacancies, extract key skills and phrases, and export the result to an Excel report.",
  openGraph: {
    title: "hhResearch",
    description: "Analyze HH vacancies and export key requirements into Excel.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
