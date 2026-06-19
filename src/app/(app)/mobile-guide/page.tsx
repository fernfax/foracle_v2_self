"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Plus, Share } from "lucide-react"

import { Button } from "@/components/ui/button"

const steps = [
  {
    number: 1,
    title: "Tap the Share button",
    description:
      "Tap the Share icon at the bottom of Safari (the square with an arrow pointing up).",
    image: "/guide/step2-share.webp",
    icon: Share
  },
  {
    number: 2,
    title: "Select 'Add to Home Screen'",
    description:
      "Scroll down in the share menu and tap 'Add to Home Screen'. You may need to scroll to find this option.",
    image: "/guide/step3-add-to-home.webp",
    icon: Plus
  },
  {
    number: 3,
    title: "Confirm and Add",
    description:
      "You can customize the name if you'd like, then tap 'Add' in the top right corner.",
    image: "/guide/step4-confirm.webp"
  },
  {
    number: 4,
    title: "Done! Launch from Home Screen",
    description:
      "Foracle is now on your home screen! Tap the icon to open it as a full-screen app without browser controls.",
    image: "/guide/step5-done.webp",
    icon: CheckCircle2
  }
]

export default function MobileGuidePage() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/overview">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-foreground mb-2 text-3xl font-bold">
          Add Foracle to Your iPhone
        </h1>
        <p className="text-muted-foreground">
          Install Foracle as a web app on your iPhone for the best mobile
          experience. It will look and feel like a native app!
        </p>
      </div>

      {/* Benefits */}
      <div className="from-brand-terracotta/[0.1] to-brand-terracotta/[0.1] mb-8 rounded-xl bg-gradient-to-r p-6">
        <h2 className="mb-3 text-lg font-semibold">Why add to home screen?</h2>
        <ul className="text-muted-foreground space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="text-on-success size-4" />
            Full-screen experience without browser UI
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="text-on-success size-4" />
            Quick access from your home screen
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="text-on-success size-4" />
            Feels like a native app
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="text-on-success size-4" />A dedicated app
            icon and its own window
          </li>
        </ul>
      </div>

      {/* Steps */}
      <div className="space-y-8">
        <h2 className="text-xl font-semibold">Step-by-step Guide</h2>

        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-card border-border/60 overflow-hidden rounded-xl border shadow-sm">
            {/* Step Header */}
            <div className="border-border/60 bg-muted/50 border-b p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground font-display flex size-8 items-center justify-center rounded-full text-sm font-semibold">
                  {step.number}
                </div>
                <h3 className="font-display text-lg font-semibold">
                  {step.title}
                </h3>
              </div>
            </div>

            {/* Step Content */}
            <div className="p-4">
              <p className="text-muted-foreground mb-4">{step.description}</p>

              {/* Image */}
              <div className="bg-muted border-border mx-auto max-w-[280px] overflow-hidden rounded-2xl border-4">
                <Image
                  src={step.image}
                  alt={step.title}
                  width={280}
                  height={600}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="border-brand-gold/[0.3] bg-brand-gold/[0.15] mt-8 rounded-xl border p-4">
        <p className="text-on-warning text-sm">
          <strong>Note:</strong> This feature only works in Safari on iOS. If
          you&apos;re using a different browser, please open this page in Safari
          first.
        </p>
      </div>
    </div>
  )
}
