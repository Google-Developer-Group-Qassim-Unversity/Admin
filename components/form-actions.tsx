import { cn } from "@/lib/utils";

/**
 * The save / cancel row at the end of a long form. On a phone it sticks just
 * above the bottom navigation so the primary action is always in thumb reach
 * without scrolling back down; from md up it is an ordinary trailing row.
 */
export function FormActions({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card border-foreground sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex gap-2 border-t px-4 py-3 *:flex-1",
        "md:static md:mx-0 md:justify-end md:border-rule md:bg-transparent md:px-0 md:pt-4 md:pb-0 md:*:flex-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
