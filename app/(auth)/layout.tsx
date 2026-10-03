import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in - GDG-Admin",
  description: "Sign in to the GDG Qassim admin console",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
