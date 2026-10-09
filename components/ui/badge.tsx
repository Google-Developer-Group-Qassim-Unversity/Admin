import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "h-6 gap-1 rounded-sm border border-transparent px-2 text-xs font-bold transition-colors has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&>svg]:size-3.5! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background [a]:hover:bg-foreground/85",
        secondary: "bg-sunk text-foreground [a]:hover:bg-rule",
        destructive: "bg-door-madder-soft text-door-madder-ink",
        outline: "text-foreground shadow-[inset_0_0_0_1px_var(--rule)] [a]:hover:bg-sunk",
        ghost: "hover:bg-sunk",
        link: "text-door-indigo-ink underline-offset-4 hover:underline",
        green: "bg-door-green-soft text-door-green-ink",
        ochre: "bg-door-ochre-soft text-door-ochre-ink",
        madder: "bg-door-madder-soft text-door-madder-ink",
        indigo: "bg-door-indigo-soft text-door-indigo-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
