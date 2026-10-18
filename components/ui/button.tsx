import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Mud & Doors buttons. `default` is mud ink, the everyday action. The four door
 * variants are painted plates and carry state like everything else coloured:
 * `ochre` for the action that is waiting on the reader (Book dates, Continue),
 * `green` for finishing something (Submit, Mark done, Publish), `madder` for
 * an irreversible destructive action, `indigo` rarely, for opening a team's work.
 */
const buttonVariants = cva(
  "rounded-lg border border-transparent bg-clip-padding text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[background-color,color,box-shadow,transform,filter] duration-150 active:translate-y-px motion-reduce:active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/88",
        outline: "bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--adobe)] hover:bg-sunk aria-expanded:bg-sunk",
        secondary: "bg-sunk text-foreground hover:bg-rule aria-expanded:bg-rule",
        ghost: "text-foreground hover:bg-sunk aria-expanded:bg-sunk",
        destructive: "bg-door-madder-soft text-door-madder-ink hover:bg-door-madder hover:text-on-door",
        link: "text-door-indigo-ink underline-offset-4 hover:underline",
        ochre: "plate-depth bg-door-ochre text-on-door-ochre hover:brightness-105",
        green: "plate-depth bg-door-green text-on-door hover:brightness-110",
        madder: "plate-depth bg-door-madder text-on-door hover:brightness-110",
        indigo: "plate-depth bg-door-indigo text-on-door hover:brightness-110",
      },
      size: {
        default: "h-10 pointer-coarse:h-11 gap-2 px-4 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
        xs: "h-7 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 pointer-coarse:h-10 gap-1.5 px-3 text-[13px] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        lg: "h-11 pointer-coarse:h-12 gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pe-4 has-data-[icon=inline-start]:ps-4",
        icon: "size-10 pointer-coarse:size-11",
        "icon-xs": "size-7 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 pointer-coarse:size-10 in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11 pointer-coarse:size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
