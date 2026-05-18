import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — see /design_guide/design_guide.md §10.4.
 *
 * Polished "soft elevated paper" surface — 24px radius, hairline warm
 * border, layered diffuse shadow so the card lifts subtly off the page
 * canvas. Both shadow layers are tinted toward Deep Forest (#1C2B2A) so
 * the shadow never reads as cold gray on the warm cream background.
 *
 * The shadow is intentionally subtle in light mode; dark mode keeps the
 * border-as-elevation approach the design guide §11 calls out (shadows
 * read poorly on dark surfaces).
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-3xl border border-[rgba(28,43,42,0.06)] bg-card text-card-foreground",
      "shadow-[0_2px_4px_rgba(28,43,42,0.08),0_12px_32px_rgba(28,43,42,0.13),0_28px_64px_rgba(28,43,42,0.09)]",
      "transition-shadow duration-200",
      "dark:border-[rgba(240,235,224,0.08)] dark:shadow-none",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-display text-base font-semibold leading-tight tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
