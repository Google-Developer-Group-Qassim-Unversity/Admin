import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Display - GDG-Admin",
  description: "Fullscreen QR code display",
};

export default function MinimalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout intentionally does not include Navbar
  // It only wraps the children without additional UI chrome
  return <>{children}</>;
}
