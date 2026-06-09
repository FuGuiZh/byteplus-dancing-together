import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--ui-radius)] border-border px-2.5 py-1 text-xs font-bold [border-width:var(--ui-border-width)] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success:
          "bg-[color-mix(in_oklch,var(--chart-4)_72%,white)] text-foreground",
        warning:
          "bg-secondary text-secondary-foreground",
        info: "bg-accent text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline: "bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
