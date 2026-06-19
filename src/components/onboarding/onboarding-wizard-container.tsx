"use client"

import Image from "next/image"
import { LucideIcon } from "lucide-react"

interface WizardContainerProps {
  currentStep: number
  totalSteps: number
  title?: string
  subtitle?: string
  children: React.ReactNode
  showProgress?: boolean
  icon?: LucideIcon
  iconBgColor?: string
  iconColor?: string
}

export function OnboardingWizardContainer({
  currentStep,
  totalSteps,
  title,
  subtitle,
  children,
  showProgress = true,
  icon: Icon,
  iconBgColor,
  iconColor
}: WizardContainerProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border/30 bg-background/85 border-b backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-6 py-4">
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
              <div className="font-display text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                Step {currentStep} of {totalSteps}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {showProgress && currentStep >= 1 && (
        <div className="bg-muted/70 h-1">
          <div
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-8">
          {(title || subtitle) && (
            <div className="mb-8">
              <div className="flex items-center gap-4">
                {Icon && iconBgColor && iconColor && (
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-md ${iconBgColor}`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                )}
                <div>
                  {title && (
                    <h1 className="font-display mb-1 text-2xl font-semibold tracking-[-0.02em]">
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
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </main>
    </div>
  )
}
