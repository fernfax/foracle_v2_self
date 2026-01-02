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
  { Icon: Calculator, bgClass: "bg-lime-100", textClass: "text-lime-600" },
  { Icon: CircleDollarSign, bgClass: "bg-violet-100", textClass: "text-violet-600" },
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
  const padding = 60;

  // Create 12 unique icons (one of each type)
  for (let i = 0; i < ICON_CONFIGS.length; i++) {
    const config = ICON_CONFIGS[i];
    const x = padding + Math.random() * (width - padding * 2);
    const y = padding + Math.random() * (height - padding * 2);

    icons.push({
      id: i,
      config,
      x,
      y,
      baseX: x,
      baseY: y,
      vx: 0,
      vy: 0,
      size: 52 + Math.random() * 16, // 52-68px
      offset: Math.random() * Math.PI * 2,
      opacity: 0.7 + Math.random() * 0.2, // 0.7-0.9
    });
  }

  return icons;
}

export function FloatingIcons() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [icons, setIcons] = useState<FloatingIcon[]>([]);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Track container dimensions
  const dimensionsRef = useRef({ width: 0, height: 0 });

  // Initialize icons on mount
  useEffect(() => {
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

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mousePos.current = { x: -1000, y: -1000 };
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  // Animation loop
  const animate = useCallback((time: number) => {
    if (!containerRef.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const padding = 40;

    setIcons((prevIcons) =>
      prevIcons.map((icon) => {
        // Base floating motion (sine wave)
        const floatX = Math.sin(time * 0.0008 + icon.offset) * 25;
        const floatY = Math.cos(time * 0.001 + icon.offset) * 20;

        // Calculate target position (base + float)
        let targetX = icon.baseX + floatX;
        let targetY = icon.baseY + floatY;

        // Cursor repulsion
        const dx = icon.x - mousePos.current.x;
        const dy = icon.y - mousePos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const repulsionRadius = 200;

        let newVx = icon.vx * 0.92; // Less friction for snappier movement
        let newVy = icon.vy * 0.92;

        if (distance < repulsionRadius && distance > 0) {
          const force = ((repulsionRadius - distance) / repulsionRadius) * 8;
          const angle = Math.atan2(dy, dx);
          newVx += Math.cos(angle) * force;
          newVy += Math.sin(angle) * force;
        }

        // Move toward target with spring physics
        const springStrength = 0.02;
        newVx += (targetX - icon.x) * springStrength;
        newVy += (targetY - icon.y) * springStrength;

        // Apply velocity
        let newX = icon.x + newVx;
        let newY = icon.y + newVy;

        // Boundary constraints with soft bounce
        if (newX < padding) {
          newX = padding;
          newVx = Math.abs(newVx) * 0.5;
        } else if (newX > rect.width - padding) {
          newX = rect.width - padding;
          newVx = -Math.abs(newVx) * 0.5;
        }

        if (newY < padding) {
          newY = padding;
          newVy = Math.abs(newVy) * 0.5;
        } else if (newY > rect.height - padding) {
          newY = rect.height - padding;
          newVy = -Math.abs(newVy) * 0.5;
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {icons.map((icon) => {
        const { Icon } = icon.config;
        return (
          <div
            key={icon.id}
            className={`absolute rounded-2xl ${icon.config.bgClass} flex items-center justify-center will-change-transform`}
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
