import type { Metadata, Viewport } from "next";
import { enCA } from "@/lib/i18n/en-CA";
import "./globals.css";

export const metadata: Metadata = {
  title: enCA.app.name,
  description: enCA.app.description,
  applicationName: enCA.app.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B6B66",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>{children}</body>
    </html>
  );
}
