import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/**
 * MoneyInput — a number Input with a fixed currency/unit adornment (see design
 * guide §10.3). Replaces the hand-rolled "absolutely-positioned <span> + pl-7"
 * idiom that was copy-pasted ~10× with two different adornment colors. The
 * adornment is always text-muted-foreground; default is a "$" prefix, but pass
 * symbol/side for "%", "yr", etc.
 */
interface MoneyInputProps extends React.ComponentProps<"input"> {
  symbol?: string
  side?: "prefix" | "suffix"
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ symbol = "$", side = "prefix", className, ...props }, ref) => {
    return (
      <div className="relative">
        <span
          className={cn(
            "text-muted-foreground pointer-events-none absolute top-1/2 -translate-y-1/2",
            side === "prefix" ? "left-3.5" : "right-3.5"
          )}>
          {symbol}
        </span>
        <Input
          ref={ref}
          type="number"
          className={cn(side === "prefix" ? "pl-7" : "pr-9", className)}
          {...props}
        />
      </div>
    )
  }
)
MoneyInput.displayName = "MoneyInput"

export { MoneyInput }
