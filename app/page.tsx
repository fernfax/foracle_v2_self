import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Target, Users, PiggyBank, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Foracle</span>
          </div>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Take Control of Your
            <span className="text-primary"> Financial Future</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Foracle empowers you to manage your finances with confidence. Track income,
            expenses, assets, and goals all in one beautiful, intuitive platform.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8">
                Start Your Journey
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
          <p className="text-xl text-muted-foreground">
            Comprehensive financial tools designed for everyone
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <PiggyBank className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Income & Expense Tracking</CardTitle>
              <CardDescription>
                Monitor your cash flow with ease. Track multiple income sources and categorize
                expenses to understand where your money goes.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Target className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Goal Setting</CardTitle>
              <CardDescription>
                Set financial goals and track your progress. Whether it's a house, retirement,
                or emergency fund, we'll help you get there.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Asset Management</CardTitle>
              <CardDescription>
                Keep track of all your assets in one place. Monitor investments, property,
                vehicles, and watch your net worth grow.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Policy Management</CardTitle>
              <CardDescription>
                Manage insurance policies and subscriptions. Never miss a renewal date or
                overpay for coverage again.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Family Planning</CardTitle>
              <CardDescription>
                Add family members and plan for their future. Track expenses and goals for
                your entire household.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Insightful Analytics</CardTitle>
              <CardDescription>
                Get personalized insights and recommendations. Make smarter financial decisions
                with data-driven guidance.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Finances?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of users who have taken control of their financial future
            </p>
            <Link href="/sign-up">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Get Started Free
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Foracle. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
