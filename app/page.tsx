import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  TrendingUp,
  Shield,
  Target,
  Users,
  PiggyBank,
  BarChart3,
  ArrowRight,
  Play,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-foreground">
              <TrendingUp className="h-5 w-5 text-background" />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Foracle
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
        <div className="absolute inset-0 bg-muted/30" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-40 text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center rounded-full bg-muted px-4 py-1.5 mb-8">
            <span className="text-xs font-medium text-muted-foreground">
              Trusted by 10,000+ users worldwide
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6">
            Take Control of Your
            <br />
            <span className="text-foreground/70">
              Finances
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Foracle empowers you to manage your finances with confidence. Track
            income, expenses, assets, and goals all in one beautiful, intuitive
            platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="px-10">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="px-10">
                Watch Demo
                <Play className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-6 lg:px-8 py-24 lg:py-32"
      >
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Features
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive financial tools designed for everyone
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="group relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-6 group-hover:bg-muted/80 transition-colors">
                <PiggyBank className="h-7 w-7 text-foreground" />
              </div>
              <CardTitle className="text-xl mb-3">
                Income & Expense Tracking
              </CardTitle>
              <CardDescription>
                Monitor your cash flow with ease. Track multiple income sources
                and categorize expenses to understand where your money goes.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-6 group-hover:bg-muted/80 transition-colors">
                <Target className="h-7 w-7 text-foreground" />
              </div>
              <CardTitle className="text-xl mb-3">Goal Setting</CardTitle>
              <CardDescription>
                Set financial goals and track your progress. Whether it's a
                house, retirement, or emergency fund, we'll help you get there.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-6 group-hover:bg-muted/80 transition-colors">
                <BarChart3 className="h-7 w-7 text-foreground" />
              </div>
              <CardTitle className="text-xl mb-3">Asset Management</CardTitle>
              <CardDescription>
                Keep track of all your assets in one place. Monitor investments,
                property, vehicles, and watch your net worth grow.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-6 group-hover:bg-muted/80 transition-colors">
                <Shield className="h-7 w-7 text-foreground" />
              </div>
              <CardTitle className="text-xl mb-3">Policy Management</CardTitle>
              <CardDescription>
                Manage insurance policies and subscriptions. Never miss a
                renewal date or overpay for coverage again.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-6 group-hover:bg-muted/80 transition-colors">
                <Users className="h-7 w-7 text-foreground" />
              </div>
              <CardTitle className="text-xl mb-3">Family Planning</CardTitle>
              <CardDescription>
                Add family members and plan for their future. Track expenses and
                goals for your entire household.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="group relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
            <CardHeader>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted mb-6 group-hover:bg-muted/80 transition-colors">
                <TrendingUp className="h-7 w-7 text-foreground" />
              </div>
              <CardTitle className="text-xl mb-3">
                Insightful Analytics
              </CardTitle>
              <CardDescription>
                Get personalized insights and recommendations. Make smarter
                financial decisions with data-driven guidance.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 py-24">
        <Card className="relative overflow-hidden border-2 border-foreground bg-foreground">
          <CardContent className="p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold text-background mb-4">
              Ready to Transform Your Finances?
            </h2>
            <p className="text-lg text-background/80 mb-10 max-w-xl mx-auto">
              Join thousands of users who have taken control of their financial
              future
            </p>
            <Link href="/sign-up">
              <Button
                size="lg"
                variant="outline"
                className="bg-background text-foreground hover:bg-background/90 px-12"
              >
                Get Started Free
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 text-center text-muted-foreground">
          <p className="text-sm">&copy; 2025 Foracle. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
