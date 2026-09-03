"use client";

import { DirectionProvider as RadixDirectionProvider } from "@radix-ui/react-direction";

// Radix ships `react-direction` without a "use client" directive, so it needs a
// client boundary of its own. Without this, dropdowns, menus and sliders keep
// their LTR alignment even when the document is RTL.
export function DirectionProvider({
  dir,
  children,
}: {
  dir: "ltr" | "rtl";
  children: React.ReactNode;
}) {
  return (
    <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>
  );
}
