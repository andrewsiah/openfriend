import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "OpenFriend — A conversation that can keep up",
  description:
    "An open-source, full-duplex personal companion for Apple Watch and the web.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#071012",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
