"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Share, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: 1,
    title: "Tap the Share button",
    description: "Tap the Share icon at the bottom of Safari (the square with an arrow pointing up).",
    image: "/guide/step2-share.png",
    icon: Share,
  },
  {
    number: 2,
    title: "Select 'Add to Home Screen'",
    description: "Scroll down in the share menu and tap 'Add to Home Screen'. You may need to scroll to find this option.",
    image: "/guide/step3-add-to-home.png",
    icon: Plus,
  },
  {
    number: 3,
    title: "Confirm and Add",
    description: "You can customize the name if you'd like, then tap 'Add' in the top right corner.",
    image: "/guide/step4-confirm.png",
  },
  {
    number: 4,
    title: "Done! Launch from Home Screen",
    description: "Foracle is now on your home screen! Tap the icon to open it as a full-screen app without browser controls.",
    image: "/guide/step5-done.png",
    icon: CheckCircle2,
  },
];

export default function MobileGuidePage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/overview">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Add Foracle to Your iPhone
        </h1>
        <p className="text-muted-foreground">
          Install Foracle as a web app on your iPhone for the best mobile experience.
          It will look and feel like a native app!
        </p>
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-lg mb-3">Why add to home screen?</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Full-screen experience without browser UI
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Quick access from your home screen
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Feels like a native app
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Works offline for cached data
          </li>
        </ul>
      </div>

      {/* Steps */}
      <div className="space-y-8">
        <h2 className="font-semibold text-xl">Step-by-step Guide</h2>

        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white rounded-xl border border-border/60 overflow-hidden shadow-sm"
          >
            {/* Step Header */}
            <div className="p-4 border-b border-border/60 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#387DF5] text-white font-semibold text-sm">
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg">{step.title}</h3>
              </div>
            </div>

            {/* Step Content */}
            <div className="p-4">
              <p className="text-muted-foreground mb-4">{step.description}</p>

              {/* Image */}
              <div className="max-w-[280px] mx-auto bg-slate-100 rounded-2xl overflow-hidden border-4 border-slate-200">
                <Image
                  src={step.image}
                  alt={step.title}
                  width={280}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> This feature only works in Safari on iOS.
          If you're using a different browser, please open this page in Safari first.
        </p>
      </div>
    </div>
  );
}
