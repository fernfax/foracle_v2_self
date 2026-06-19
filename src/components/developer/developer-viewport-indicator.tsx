import { IS_PROD } from "@/configs/env.config"

// Dev-only badge that names the active Tailwind breakpoint (xs → 2xl). Purely
// CSS-driven: each label toggles via responsive `block`/`hidden` utilities, so
// it updates on resize with no JS. Anchored bottom-right; the Next.js dev tools
// indicator is moved to bottom-left (next.config.ts) to keep them apart.
export const DeveloperViewportIndicator = () => {
  if (IS_PROD) return null

  return (
    <div className="bg-primary text-primary-foreground fixed right-4 bottom-4 z-50 flex size-6 items-center justify-center rounded-full p-3 font-mono text-xs">
      <div className="block sm:hidden">xs</div>
      <div className="hidden sm:block md:hidden">sm</div>
      <div className="hidden md:block lg:hidden">md</div>
      <div className="hidden lg:block xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  )
}
