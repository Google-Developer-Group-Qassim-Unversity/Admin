import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Denied - GDG-Admin",
  description: "Access denied - Admin privileges required",
};

export default function DeniedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
