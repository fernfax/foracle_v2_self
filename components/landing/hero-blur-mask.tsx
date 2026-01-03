"use client";

import { useEffect, useRef, useState } from "react";

interface BlurZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function HeroBlurMask() {
  const [blurZones, setBlurZones] = useState<BlurZone[]>([]);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const updateBlurZones = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();

      // Find text elements to blur behind
      const selectors = [
        "[data-blur-target='heading']",
        "[data-blur-target='subheading']",
        "[data-blur-target='description']",
        "[data-blur-target='badge']",
        "[data-blur-target='cta']",
      ];

      const zones: BlurZone[] = [];

      selectors.forEach((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Add some padding for a softer, more organic feel
          const padding = 16;
          zones.push({
            x: rect.left - containerRect.left - padding,
            y: rect.top - containerRect.top - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });
        }
      });

      setBlurZones(zones);
    };

    // Initial calculation after a short delay for layout
    const timer = setTimeout(updateBlurZones, 100);

    // Update on resize
    window.addEventListener("resize", updateBlurZones);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateBlurZones);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
    >
      {blurZones.map((zone, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: zone.x,
            top: zone.y,
            width: zone.width,
            height: zone.height,
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            maskImage: `
              linear-gradient(to right, transparent, black 30px, black calc(100% - 30px), transparent),
              linear-gradient(to bottom, transparent, black 30px, black calc(100% - 30px), transparent)
            `,
            WebkitMaskImage: `
              linear-gradient(to right, transparent, black 30px, black calc(100% - 30px), transparent),
              linear-gradient(to bottom, transparent, black 30px, black calc(100% - 30px), transparent)
            `,
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        />
      ))}
    </div>
  );
}
