"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  Calculator,
  CircleDollarSign,
  Receipt,
  Banknote,
  BadgeDollarSign,
  ChartLine,
  HandCoins,
  LucideIcon,
} from "lucide-react";

interface IconConfig {
  Icon: LucideIcon;
  bgClass: string;
  textClass: string;
}

const ICON_CONFIGS: IconConfig[] = [
  { Icon: Wallet, bgClass: "bg-emerald-100/60", textClass: "text-emerald-600" },
  { Icon: Target, bgClass: "bg-blue-100/60", textClass: "text-blue-600" },
  { Icon: TrendingUp, bgClass: "bg-amber-100/60", textClass: "text-amber-600" },
  { Icon: Shield, bgClass: "bg-pink-100/60", textClass: "text-pink-600" },
  { Icon: Users, bgClass: "bg-purple-100/60", textClass: "text-purple-600" },
  { Icon: BarChart3, bgClass: "bg-indigo-100/60", textClass: "text-indigo-600" },
  { Icon: PiggyBank, bgClass: "bg-rose-100/60", textClass: "text-rose-600" },
  { Icon: CreditCard, bgClass: "bg-cyan-100/60", textClass: "text-cyan-600" },
  { Icon: Landmark, bgClass: "bg-slate-100/60", textClass: "text-slate-600" },
  { Icon: Coins, bgClass: "bg-orange-100/60", textClass: "text-orange-600" },
  { Icon: Calculator, bgClass: "bg-lime-100/60", textClass: "text-lime-600" },
  { Icon: CircleDollarSign, bgClass: "bg-violet-100/60", textClass: "text-violet-600" },
  { Icon: Receipt, bgClass: "bg-teal-100/60", textClass: "text-teal-600" },
  { Icon: Banknote, bgClass: "bg-green-100/60", textClass: "text-green-600" },
  { Icon: BadgeDollarSign, bgClass: "bg-yellow-100/60", textClass: "text-yellow-600" },
  { Icon: ChartLine, bgClass: "bg-sky-100/60", textClass: "text-sky-600" },
  { Icon: HandCoins, bgClass: "bg-fuchsia-100/60", textClass: "text-fuchsia-600" },
];

interface FloatingIcon {
  id: number;
  config: IconConfig;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  offset: number;
  opacity: number;
}

function generateIcons(width: number, height: number): FloatingIcon[] {
  const icons: FloatingIcon[] = [];

  // Create icons that fall from the top on page load
  for (let i = 0; i < ICON_CONFIGS.length; i++) {
    const config = ICON_CONFIGS[i];
    // Start icons spread across the top, slightly off-screen
    const x = Math.random() * width;
    const y = -100 - Math.random() * 200; // Start above viewport (-100 to -300)

    // Give each icon a slight horizontal drift and downward fall velocity
    const vx = (Math.random() - 0.5) * 0.8; // Slight left/right drift
    const vy = 1.5 + Math.random() * 1.5; // Fall speed (1.5 to 3.0)

    icons.push({
      id: i,
      config,
      x,
      y,
      baseX: x,
      baseY: y,
      vx,
      vy,
      size: 56 + Math.random() * 20, // 56-76px
      offset: Math.random() * Math.PI * 2,
      opacity: 0.7 + Math.random() * 0.2, // 0.7-0.9
    });
  }

  return icons;
}

export function FloatingIcons() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [icons, setIcons] = useState<FloatingIcon[]>([]);
  const [mounted, setMounted] = useState(false);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Track container dimensions
  const dimensionsRef = useRef({ width: 0, height: 0 });

  // Initialize icons on mount
  useEffect(() => {
    setMounted(true);
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    dimensionsRef.current = { width: rect.width, height: rect.height };
    setIcons(generateIcons(rect.width, rect.height));

    const handleResize = () => {
      if (!containerRef.current) return;
      const newRect = containerRef.current.getBoundingClientRect();
      const oldWidth = dimensionsRef.current.width;
      const oldHeight = dimensionsRef.current.height;

      if (oldWidth === 0 || oldHeight === 0) {
        setIcons(generateIcons(newRect.width, newRect.height));
      } else {
        // Scale existing positions proportionally
        const scaleX = newRect.width / oldWidth;
        const scaleY = newRect.height / oldHeight;

        setIcons((prevIcons) =>
          prevIcons.map((icon) => ({
            ...icon,
            x: icon.x * scaleX,
            y: icon.y * scaleY,
            baseX: icon.baseX * scaleX,
            baseY: icon.baseY * scaleY,
          }))
        );
      }

      dimensionsRef.current = { width: newRect.width, height: newRect.height };
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mouse tracking - use window-level events so icons react everywhere on screen
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Track mouse on window so it works even over text/buttons
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Animation loop
  const animate = useCallback((time: number) => {
    if (!containerRef.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const buffer = 80; // How far off-screen before wrapping

    setIcons((prevIcons) =>
      prevIcons.map((icon) => {
        // Cursor repulsion
        const dx = icon.x - mousePos.current.x;
        const dy = icon.y - mousePos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repulsionRadius = 200;

        let newVx = icon.vx;
        let newVy = icon.vy;

        if (distance < repulsionRadius && distance > 0) {
          const force = ((repulsionRadius - distance) / repulsionRadius) * 8;
          const angle = Math.atan2(dy, dx);
          newVx += Math.cos(angle) * force;
          newVy += Math.sin(angle) * force;
        }

        // Apply gentle friction but maintain minimum drift speed
        newVx *= 0.98;
        newVy *= 0.98;

        // Add subtle wandering force (changes direction slowly)
        const wanderAngle = Math.sin(time * 0.0003 + icon.offset * 10) * 0.02;
        newVx += Math.cos(icon.offset + time * 0.0001) * 0.015;
        newVy += Math.sin(icon.offset + time * 0.0001) * 0.015;

        // Ensure minimum speed so icons keep moving
        const speed = Math.sqrt(newVx * newVx + newVy * newVy);
        const minSpeed = 0.3;
        const maxSpeed = 4;

        if (speed < minSpeed) {
          const scale = minSpeed / (speed || 0.1);
          newVx *= scale;
          newVy *= scale;
        } else if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          newVx *= scale;
          newVy *= scale;
        }

        // Apply velocity
        let newX = icon.x + newVx;
        let newY = icon.y + newVy;

        // Wrap around edges (disappear and reappear from opposite side)
        if (newX < -buffer) {
          newX = rect.width + buffer - 10;
        } else if (newX > rect.width + buffer) {
          newX = -buffer + 10;
        }

        if (newY < -buffer) {
          newY = rect.height + buffer - 10;
        } else if (newY > rect.height + buffer) {
          newY = -buffer + 10;
        }

        return {
          ...icon,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
        };
      })
    );

    lastTimeRef.current = time;
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

  // Don't render icons until mounted to prevent hydration mismatch
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {mounted && icons.map((icon) => {
        const { Icon } = icon.config;
        return (
          <div
            key={icon.id}
            className={`absolute rounded-2xl ${icon.config.bgClass} backdrop-blur-md flex items-center justify-center will-change-transform pointer-events-none border border-white/20`}
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
