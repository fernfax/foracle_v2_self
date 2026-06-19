"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowRight,
  BarChart3,
  Coins,
  CreditCard,
  Landmark,
  LucideIcon,
  PiggyBank,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react"

import { type TourName } from "@/lib/tour/tour-config"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface IconConfig {
  Icon: LucideIcon
  bgClass: string
  textClass: string
}

const ICON_CONFIGS: IconConfig[] = [
  {
    Icon: Wallet,
    bgClass: "bg-brand-teal/[0.12]",
    textClass: "text-on-success"
  },
  {
    Icon: Target,
    bgClass: "bg-brand-terracotta/[0.1]",
    textClass: "text-on-brand"
  },
  {
    Icon: TrendingUp,
    bgClass: "bg-brand-gold/[0.15]",
    textClass: "text-on-warning"
  },
  {
    Icon: Shield,
    bgClass: "bg-brand-alert-red/[0.12]",
    textClass: "text-on-danger"
  },
  {
    Icon: Users,
    bgClass: "bg-brand-terracotta/[0.1]",
    textClass: "text-on-brand"
  },
  {
    Icon: BarChart3,
    bgClass: "bg-brand-terracotta/[0.1]",
    textClass: "text-on-brand"
  },
  {
    Icon: PiggyBank,
    bgClass: "bg-brand-alert-red/[0.12]",
    textClass: "text-on-danger"
  },
  {
    Icon: CreditCard,
    bgClass: "bg-brand-teal/[0.12]",
    textClass: "text-on-success"
  },
  { Icon: Landmark, bgClass: "bg-muted", textClass: "text-foreground" },
  {
    Icon: Coins,
    bgClass: "bg-brand-terracotta/[0.1]",
    textClass: "text-on-brand"
  }
]

interface FloatingIcon {
  id: number
  config: IconConfig
  x: number
  y: number
  vx: number
  vy: number
  size: number
  offset: number
  opacity: number
}

function generateModalIcons(width: number, height: number): FloatingIcon[] {
  const icons: FloatingIcon[] = []

  for (let i = 0; i < ICON_CONFIGS.length; i++) {
    const config = ICON_CONFIGS[i]
    // Start icons at random positions within the modal
    const x = Math.random() * width
    const y = Math.random() * height

    // Give each icon a slight drift velocity
    const vx = (Math.random() - 0.5) * 0.6
    const vy = (Math.random() - 0.5) * 0.6

    icons.push({
      id: i,
      config,
      x,
      y,
      vx,
      vy,
      size: 36 + Math.random() * 12, // 36-48px (smaller for modal)
      offset: Math.random() * Math.PI * 2,
      opacity: 0.6 + Math.random() * 0.2 // 0.6-0.8
    })
  }

  return icons
}

function ModalFloatingIcons() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [icons, setIcons] = useState<FloatingIcon[]>([])
  const animationRef = useRef<number | null>(null)

  // Generate icons once the container has a real layout box to measure. Icons
  // stay empty (nothing rendered) until then, so this doubles as the mount
  // gate — the server and first client paint render no icons, no mismatch.
  useEffect(() => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    setIcons(generateModalIcons(rect.width, rect.height))

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Holds the latest `animate` so each frame can schedule the next without
  // referencing the callback variable before it's declared.
  const animateRef = useRef<(time: number) => void>(() => {})

  const animate = useCallback((time: number) => {
    if (!containerRef.current) {
      animationRef.current = requestAnimationFrame(animateRef.current)
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const buffer = 40

    setIcons((prevIcons) =>
      prevIcons.map((icon) => {
        let newVx = icon.vx
        let newVy = icon.vy

        // Add subtle wandering force
        newVx += Math.cos(icon.offset + time * 0.0001) * 0.008
        newVy += Math.sin(icon.offset + time * 0.0001) * 0.008

        // Apply gentle friction
        newVx *= 0.99
        newVy *= 0.99

        // Ensure minimum speed
        const speed = Math.sqrt(newVx * newVx + newVy * newVy)
        const minSpeed = 0.15
        const maxSpeed = 1.5

        if (speed < minSpeed) {
          const scale = minSpeed / (speed || 0.1)
          newVx *= scale
          newVy *= scale
        } else if (speed > maxSpeed) {
          const scale = maxSpeed / speed
          newVx *= scale
          newVy *= scale
        }

        let newX = icon.x + newVx
        let newY = icon.y + newVy

        // Wrap around edges
        if (newX < -buffer) newX = rect.width + buffer - 10
        else if (newX > rect.width + buffer) newX = -buffer + 10
        if (newY < -buffer) newY = rect.height + buffer - 10
        else if (newY > rect.height + buffer) newY = -buffer + 10

        return { ...icon, x: newX, y: newY, vx: newVx, vy: newVy }
      })
    )

    animationRef.current = requestAnimationFrame(animateRef.current)
  }, [])

  // Keep the ref pointing at the current callback for the rAF loop.
  useEffect(() => {
    animateRef.current = animate
  }, [animate])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden rounded-t-lg"
      style={{ zIndex: 1 }}>
      {icons.map((icon) => {
        const { Icon } = icon.config
        return (
          <div
            key={icon.id}
            className={`absolute rounded-xl ${icon.config.bgClass} pointer-events-none flex items-center justify-center will-change-transform`}
            style={{
              width: icon.size,
              height: icon.size,
              transform: `translate(${icon.x - icon.size / 2}px, ${icon.y - icon.size / 2}px)`,
              opacity: icon.opacity
            }}>
            <Icon
              className={icon.config.textClass}
              style={{ width: icon.size * 0.5, height: icon.size * 0.5 }}
            />
          </div>
        )
      })}
    </div>
  )
}

// Tour-specific content
const TOUR_CONTENT: Record<TourName, { title: string; description: string }> = {
  overall: {
    title: "Welcome to Foracle",
    description:
      "Let's take a quick tour to help you get familiar with the app and discover all the tools to manage your finances."
  },
  dashboard: {
    title: "Dashboard Tour",
    description:
      "Explore your financial command center. We'll show you how to track your income, expenses, savings, and view your monthly balance projections."
  },
  incomes: {
    title: "Incomes Tour",
    description:
      "Meet your Projected Income River — a living timeline of every stream. We'll show you how to read the curve, switch between gross and take-home, zoom across the years, and edit your income directly."
  },
  expenses: {
    title: "Expenses Tour",
    description:
      "Master your expense tracking. We'll show you how to view monthly totals, filter by category, manage custom categories, and add new expenses."
  },
  cpf: {
    title: "CPF Tour",
    description:
      "Understand your CPF at a glance — household balances, per-member OA/SA/MA breakdowns, and a projection that adjusts as members age through the contribution brackets."
  },
  holdings: {
    title: "Net Worth Tour",
    description:
      "See everything you own and owe in one place. We'll walk through your net worth, the breakdown by asset class, and how to add a holding."
  },
  goals: {
    title: "Goals Tour",
    description:
      "Set financial goals and watch your progress. We'll show you how to add a goal and track how close you are to reaching each one."
  },
  budget: {
    title: "Budget Tour",
    description:
      "Stay on top of monthly spending. We'll show you your budget overview, spending by category, and how to set the limits that keep you on track."
  }
}

interface WelcomeHeroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGetStarted: () => void
  tourName?: TourName
}

export function TourWelcomeHeroModal({
  open,
  onOpenChange,
  onGetStarted,
  tourName = "overall"
}: WelcomeHeroModalProps) {
  const content = TOUR_CONTENT[tourName]
  const isOverall = tourName === "overall"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-0 p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">{content.title}</DialogTitle>
        {/* Animated background section */}
        <div className="from-muted via-brand-terracotta/[0.1]/50 to-brand-terracotta/[0.1]/30 relative h-44 overflow-hidden bg-gradient-to-br">
          <ModalFloatingIcons />
          {/* Gradient overlay for better text readability — uses the theme bg
              (warm-white in light, nightfall in dark) so the title stays legible
              in both modes instead of fading onto a hardcoded white. */}
          <div className="from-background via-background/60 absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
        </div>

        {/* Content section */}
        <div className="relative z-20 -mt-12 px-8 pb-8">
          {/* Welcome text */}
          <div className="mb-8 space-y-3 text-center">
            {isOverall ? (
              <h2 className="text-foreground flex items-end justify-center gap-3 text-3xl font-semibold">
                Welcome to{" "}
                <Image
                  src="/wordmark-168.png"
                  alt="Foracle"
                  width={120}
                  height={35}
                  className="mb-1 inline-block object-contain"
                />
              </h2>
            ) : (
              <h2 className="text-foreground text-3xl font-semibold">
                {content.title}
              </h2>
            )}
            <p className="text-foreground leading-relaxed">
              {content.description}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onGetStarted}
            className="h-12 w-full text-base font-medium transition-all duration-200">
            Get Started
            <ArrowRight className="ml-2 size-4" />
          </Button>

          {/* Skip option */}
          <Button
            variant="link"
            onClick={() => onOpenChange(false)}
            className="text-foreground/400 hover:text-foreground mt-3 w-full text-sm no-underline">
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
