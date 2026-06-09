import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--ui-radius)] border-border text-sm font-bold [border-width:var(--ui-border-width)] transition-[background-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-x-1 active:translate-y-1 active:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [box-shadow:var(--ui-shadow)] hover:bg-[color-mix(in_oklch,var(--primary)_86%,white)]",
        secondary:
          "bg-secondary text-secondary-foreground [box-shadow:var(--ui-shadow)] hover:bg-[color-mix(in_oklch,var(--secondary)_86%,white)]",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:border-border hover:bg-muted",
        outline:
          "bg-background text-foreground [box-shadow:var(--ui-shadow)] hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground [box-shadow:var(--ui-shadow)] hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
