"use client";

import Image from "next/image";
import { LucideIcon } from "lucide-react";

interface WizardContainerProps {
  currentStep: number;
  totalSteps: number;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showProgress?: boolean;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export function WizardContainer({
  currentStep,
  totalSteps,
  title,
  subtitle,
  children,
  showProgress = true,
  icon: Icon,
  iconBgColor,
  iconColor,
}: WizardContainerProps) {
  const progress = ((currentStep) / totalSteps) * 100;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/wordmark-168.png"
                alt="Foracle"
                width={97}
                height={28}
                className="object-contain"
              />
            </div>
            {showProgress && currentStep >= 1 && (
              <div className="text-sm text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {showProgress && currentStep >= 1 && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-foreground transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col relative isolate">
          {/* Frost overlay with soft edges - sized to content only */}
          <div
            className="absolute top-0 left-0 right-0 backdrop-blur-md bg-white/50 pointer-events-none"
            style={{
              zIndex: -1,
              height: "650px",
              maxHeight: "70%",
              maskImage: `
                linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent),
                linear-gradient(to bottom, transparent, black 40px, black calc(100% - 80px), transparent)
              `,
              WebkitMaskImage: `
                linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent),
                linear-gradient(to bottom, transparent, black 40px, black calc(100% - 80px), transparent)
              `,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          />
          {(title || subtitle) && (
            <div className="mb-8">
              <div className="flex items-center gap-4">
                {Icon && iconBgColor && iconColor && (
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgColor}`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                )}
                <div>
                  {title && (
                    <h1 className="text-2xl font-semibold tracking-tight mb-1">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex-1 flex flex-col">{children}</div>
        </div>
      </main>
    </div>
  );
}
