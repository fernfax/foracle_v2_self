"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Wallet,
  Target,
  TrendingUp,
  Shield,
  Users,
  BarChart3,
  PiggyBank,
  CreditCard,
  Landmark,
  Coins,
  LucideIcon,
} from "lucide-react";

interface IconConfig {
  Icon: LucideIcon;
  bgClass: string;
  textClass: string;
}

const ICON_CONFIGS: IconConfig[] = [
  { Icon: Wallet, bgClass: "bg-emerald-100", textClass: "text-emerald-600" },
  { Icon: Target, bgClass: "bg-blue-100", textClass: "text-blue-600" },
  { Icon: TrendingUp, bgClass: "bg-amber-100", textClass: "text-amber-600" },
  { Icon: Shield, bgClass: "bg-pink-100", textClass: "text-pink-600" },
  { Icon: Users, bgClass: "bg-purple-100", textClass: "text-purple-600" },
  { Icon: BarChart3, bgClass: "bg-indigo-100", textClass: "text-indigo-600" },
  { Icon: PiggyBank, bgClass: "bg-rose-100", textClass: "text-rose-600" },
  { Icon: CreditCard, bgClass: "bg-cyan-100", textClass: "text-cyan-600" },
  { Icon: Landmark, bgClass: "bg-slate-100", textClass: "text-slate-600" },
  { Icon: Coins, bgClass: "bg-orange-100", textClass: "text-orange-600" },
];

interface FloatingIcon {
  id: number;
  config: IconConfig;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  offset: number;
  opacity: number;
}

function generateModalIcons(width: number, height: number): FloatingIcon[] {
  const icons: FloatingIcon[] = [];

  for (let i = 0; i < ICON_CONFIGS.length; i++) {
    const config = ICON_CONFIGS[i];
    // Start icons at random positions within the modal
    const x = Math.random() * width;
    const y = Math.random() * height;

    // Give each icon a slight drift velocity
    const vx = (Math.random() - 0.5) * 0.6;
    const vy = (Math.random() - 0.5) * 0.6;

    icons.push({
      id: i,
      config,
      x,
      y,
      vx,
      vy,
      size: 36 + Math.random() * 12, // 36-48px (smaller for modal)
      offset: Math.random() * Math.PI * 2,
      opacity: 0.6 + Math.random() * 0.2, // 0.6-0.8
    });
  }

  return icons;
}

function ModalFloatingIcons() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [icons, setIcons] = useState<FloatingIcon[]>([]);
  const [mounted, setMounted] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setIcons(generateModalIcons(rect.width, rect.height));

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const animate = useCallback((time: number) => {
    if (!containerRef.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const buffer = 40;

    setIcons((prevIcons) =>
      prevIcons.map((icon) => {
        let newVx = icon.vx;
        let newVy = icon.vy;

        // Add subtle wandering force
        newVx += Math.cos(icon.offset + time * 0.0001) * 0.008;
        newVy += Math.sin(icon.offset + time * 0.0001) * 0.008;

        // Apply gentle friction
        newVx *= 0.99;
        newVy *= 0.99;

        // Ensure minimum speed
        const speed = Math.sqrt(newVx * newVx + newVy * newVy);
        const minSpeed = 0.15;
        const maxSpeed = 1.5;

        if (speed < minSpeed) {
          const scale = minSpeed / (speed || 0.1);
          newVx *= scale;
          newVy *= scale;
        } else if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          newVx *= scale;
          newVy *= scale;
        }

        let newX = icon.x + newVx;
        let newY = icon.y + newVy;

        // Wrap around edges
        if (newX < -buffer) newX = rect.width + buffer - 10;
        else if (newX > rect.width + buffer) newX = -buffer + 10;
        if (newY < -buffer) newY = rect.height + buffer - 10;
        else if (newY > rect.height + buffer) newY = -buffer + 10;

        return { ...icon, x: newX, y: newY, vx: newVx, vy: newVy };
      })
    );

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden rounded-t-lg"
      style={{ zIndex: 1 }}
    >
      {mounted &&
        icons.map((icon) => {
          const { Icon } = icon.config;
          return (
            <div
              key={icon.id}
              className={`absolute rounded-xl ${icon.config.bgClass} flex items-center justify-center will-change-transform pointer-events-none`}
              style={{
                width: icon.size,
                height: icon.size,
                transform: `translate(${icon.x - icon.size / 2}px, ${icon.y - icon.size / 2}px)`,
                opacity: icon.opacity,
              }}
            >
              <Icon
                className={icon.config.textClass}
                style={{ width: icon.size * 0.5, height: icon.size * 0.5 }}
              />
            </div>
          );
        })}
    </div>
  );
}

import { type TourName } from "@/lib/tour/tour-config";

// Tour-specific content
const TOUR_CONTENT: Record<TourName, { title: string; description: string }> = {
  overall: {
    title: "Welcome to Foracle",
    description: "Let's take a quick tour to help you get familiar with the app and discover all the tools to manage your finances.",
  },
  dashboard: {
    title: "Dashboard Tour",
    description: "Explore your financial command center. We'll show you how to track your income, expenses, savings, and view your monthly balance projections.",
  },
  incomes: {
    title: "Incomes Tour",
    description: "Learn how to manage your income sources effectively. We'll cover adding incomes, filtering by frequency, and understanding your CPF contributions.",
  },
  expenses: {
    title: "Expenses Tour",
    description: "Master your expense tracking. We'll show you how to view monthly totals, filter by category, manage custom categories, and add new expenses.",
  },
};

interface WelcomeHeroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGetStarted: () => void;
  tourName?: TourName;
}

export function WelcomeHeroModal({
  open,
  onOpenChange,
  onGetStarted,
  tourName = "overall",
}: WelcomeHeroModalProps) {
  const content = TOUR_CONTENT[tourName];
  const isOverall = tourName === "overall";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-0 gap-0">
        <DialogTitle className="sr-only">{content.title}</DialogTitle>
        {/* Animated background section */}
        <div className="relative h-44 bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30 overflow-hidden">
          <ModalFloatingIcons />
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent z-10" />
        </div>

        {/* Content section */}
        <div className="relative px-8 pb-8 -mt-12 z-20">
          {/* Welcome text */}
          <div className="text-center space-y-3 mb-8">
            {isOverall ? (
              <h2 className="text-3xl font-semibold text-slate-900 flex items-end justify-center gap-3">
                Welcome to{" "}
                <Image
                  src="/wordmark-168.png"
                  alt="Foracle"
                  width={120}
                  height={35}
                  className="object-contain inline-block mb-1"
                />
              </h2>
            ) : (
              <h2 className="text-3xl font-semibold text-slate-900">
                {content.title}
              </h2>
            )}
            <p className="text-slate-600 leading-relaxed">
              {content.description}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={onGetStarted}
            className="w-full h-12 text-base font-medium bg-[#387DF5] hover:bg-[#2d6ad4] shadow-lg shadow-blue-200/50 transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {/* Skip option */}
          <button
            onClick={() => onOpenChange(false)}
            className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
