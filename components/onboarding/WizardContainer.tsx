"use client";

import { TrendingUp, LucideIcon } from "lucide-react";

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
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-foreground">
                <TrendingUp className="h-5 w-5 text-background" />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Foracle
              </span>
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
        <div className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col">
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
