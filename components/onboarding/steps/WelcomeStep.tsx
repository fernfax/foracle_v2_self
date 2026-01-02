"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { TrendingUp, PiggyBank, Target, BarChart3, ChevronRight } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Track Your Income",
    description: "Monitor all your income sources in one place",
  },
  {
    icon: PiggyBank,
    title: "Manage CPF",
    description: "Keep track of your CPF contributions and allocations",
  },
  {
    icon: BarChart3,
    title: "Monitor Holdings",
    description: "View your savings and investments at a glance",
  },
  {
    icon: Target,
    title: "Set Financial Goals",
    description: "Plan and track your financial milestones",
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      {/* Hero Section */}
      <div className="mb-12">
        <Image
          src="/logo-128.png"
          alt="Foracle Logo"
          width={80}
          height={80}
          className="mx-auto mb-6"
        />
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to Foracle
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Your personal finance companion for smarter money management
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 max-w-2xl w-full">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-card text-left"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
              <feature.icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-medium mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <Button
        size="lg"
        onClick={onNext}
        className="gap-2 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
      >
        Get Started
        <ChevronRight className="h-5 w-5" />
      </Button>

      <p className="text-sm text-muted-foreground mt-4">
        Takes about 3 minutes to set up
      </p>
    </div>
  );
}
