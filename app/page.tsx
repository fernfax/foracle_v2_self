import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TileMotif } from "@/components/ui/tile-motif";
import { FloatingIcons } from "@/components/landing/floating-icons";
import { HeroBlurMask } from "@/components/landing/hero-blur-mask";
import {
  TrendingUp,
  Shield,
  Target,
  Users,
  Wallet,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Wallet,
    title: "Income & Expense Tracking",
    description:
      "Monitor your cash flow with ease. Track multiple income sources and categorize expenses to understand where your money goes.",
    accent: "text-[#3A6B52] bg-[rgba(58,107,82,0.10)]",
  },
  {
    icon: Target,
    title: "Goal Setting",
    description:
      "Set financial goals and track your progress. Whether it's a house, retirement, or emergency fund, we'll help you get there.",
    accent: "text-[#B8622A] bg-[rgba(184,98,42,0.10)]",
  },
  {
    icon: TrendingUp,
    title: "Asset Management",
    description:
      "Keep track of all your assets in one place. Monitor investments, property, vehicles, and watch your net worth grow.",
    accent: "text-[#D4A843] bg-[rgba(212,168,67,0.12)]",
  },
  {
    icon: Shield,
    title: "Policy Management",
    description:
      "Manage insurance policies and subscriptions. Never miss a renewal date or overpay for coverage again.",
    accent: "text-[#00C4AA] bg-[rgba(0,196,170,0.10)]",
  },
  {
    icon: Users,
    title: "Family Planning",
    description:
      "Add family members and plan for their future. Track expenses and goals for your entire household.",
    accent: "text-[#D4845A] bg-[rgba(212,132,90,0.12)]",
  },
  {
    icon: BarChart3,
    title: "Insightful Analytics",
    description:
      "Get personalized insights and recommendations. Make smarter financial decisions with data-driven guidance.",
    accent: "text-[#3A6B52] bg-[rgba(58,107,82,0.10)]",
  },
] as const;

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/overview");
  }
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/wordmark-168.png"
              alt="Foracle"
              width={97}
              height={28}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/40" />
        <FloatingIcons />
        <HeroBlurMask />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-40 text-center">
          <p className="font-display text-[11px] font-semibold tracking-[0.2em] uppercase text-[#B8622A] mb-6">
            A guided companion for your money
          </p>
          <h1
            data-blur-target="heading"
            className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.025em] mb-6 inline-block text-foreground"
          >
            Take control of your
            <br />
            <span className="text-foreground/55">finances.</span>
          </h1>

          <p
            data-blur-target="description"
            className="font-editorial text-lg md:text-xl text-foreground/65 max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Foracle helps you track income, expenses, assets, and goals — calmly,
            in one place rooted in Singaporean rhythms.
          </p>

          <div
            data-blur-target="badge"
            className="inline-flex items-center rounded-full bg-[rgba(184,98,42,0.10)] px-4 py-1.5 mb-8 border border-[rgba(184,98,42,0.18)]"
          >
            <span className="font-display text-[11px] font-semibold tracking-wide uppercase text-[#7A3A0A]">
              Made for Singapore, by Singaporeans
            </span>
          </div>

          <div className="flex justify-center">
            <Link href="/sign-up" data-blur-target="cta">
              <Button size="lg" className="px-10 transition-all duration-200">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pb-12">
          <TileMotif size="standard" />
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32"
      >
        <div className="text-center mb-16">
          <p className="font-display text-[11px] font-semibold tracking-[0.2em] uppercase text-[#B8622A] mb-4">
            Features
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em] mb-4 text-foreground">
            Everything you need to succeed
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive financial tools designed for everyone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description, accent }) => (
            <Card
              key={title}
              className="group relative overflow-hidden hover:-translate-y-0.5 hover:border-border/60 transition-all duration-300"
            >
              <CardHeader>
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-md mb-5 transition-colors ${accent}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg mb-3">{title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 py-24">
        <Card className="relative overflow-hidden border-0 bg-[#1C2B2A]">
          <CardContent className="p-12 lg:p-16 text-center">
            <p className="font-display text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4845A] mb-4">
              Get Started
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-[#F0EBE0] mb-4">
              Ready to transform your finances?
            </h2>
            <p className="text-base md:text-lg text-[rgba(240,235,224,0.65)] mb-10 max-w-xl mx-auto">
              Join thousands of users who have taken control of their financial
              future.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="px-12 transition-all duration-200">
                Get Started Free
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 text-center">
          <TileMotif size="thin" className="mb-6" />
          <p className="text-sm text-muted-foreground">
            &copy; 2025 Foracle. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
