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
    bgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: PiggyBank,
    title: "Manage CPF",
    description: "Keep track of your CPF contributions and allocations",
    bgColor: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    icon: BarChart3,
    title: "Monitor Holdings",
    description: "View your savings and investments at a glance",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: Target,
    title: "Set Financial Goals",
    description: "Plan and track your financial milestones",
    bgColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      {/* Hero Section */}
      <div className="mb-12" data-blur-target="heading">
        <div className="flex items-end justify-center gap-3 mb-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to
          </h1>
          <Image
            src="/wordmark-168.png"
            alt="Foracle"
            width={145}
            height={42}
            className="object-contain mb-0.5"
          />
        </div>
        <p className="text-xl text-muted-foreground max-w-md mx-auto" data-blur-target="description">
          Your personal finance companion for smarter money management
        </p>
      </div>

      {/* Features Grid */}
      <div data-blur-target="features" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12 max-w-2xl w-full">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm text-left"
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${feature.bgColor} shrink-0`}>
              <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
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
        data-blur-target="cta"
        className="gap-2 px-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all duration-200"
      >
        Get Started
        <ChevronRight className="h-5 w-5" />
      </Button>

      <p className="text-sm text-muted-foreground mt-4" data-blur-target="subtext">
        Takes about 3 minutes to set up
      </p>
    </div>
  );
}
