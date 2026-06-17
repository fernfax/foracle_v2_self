"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Calculator,
  Compass,
  DollarSign,
  GraduationCap,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  Receipt,
  Smartphone,
  Target,
  Wallet
} from "lucide-react"

import { type TourName } from "@/lib/tour/tour-config"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

import { useTourContext } from "./tour-provider"
import { WelcomeHeroModal } from "./welcome-hero-modal"

const PENDING_TOUR_KEY = "foracle_pending_tour"
const NEW_USER_TOUR_KEY = "foracle_new_user_tour"

// Map tours to their target pages (pathname only, no query params)
const TOUR_PATHNAMES: Record<TourName, string> = {
  overall: "/overview",
  dashboard: "/overview",
  incomes: "/user",
  expenses: "/user",
  cpf: "/user",
  holdings: "/user",
  goals: "/goals",
  budget: "/budget"
}

// Tours that live on a specific /user tab. We must also match the `?tab=`
// param, not just the pathname, before a tour can start.
const TOUR_TABS: Partial<Record<TourName, string>> = {
  incomes: "incomes",
  expenses: "expenses",
  cpf: "cpf",
  holdings: "holdings"
}

// Full URLs including query params for navigation
const TOUR_ROUTES: Record<TourName, string> = {
  overall: "/overview",
  dashboard: "/overview",
  incomes: "/user?tab=incomes",
  expenses: "/user?tab=expenses",
  cpf: "/user?tab=cpf",
  holdings: "/user?tab=holdings",
  goals: "/goals",
  budget: "/budget"
}

const TOUR_PAGE_NAMES: Record<TourName, string> = {
  overall: "Overview",
  dashboard: "Overview",
  incomes: "Incomes",
  expenses: "Expenses",
  cpf: "CPF",
  holdings: "Holdings",
  goals: "Goals",
  budget: "Budget"
}

export function HelpButton() {
  const { startTour } = useTourContext()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const startTourRef = useRef(startTour)
  const hasStartedPendingTour = useRef(false)

  const [pendingTour, setPendingTour] = useState<TourName | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [welcomeModalTour, setWelcomeModalTour] = useState<TourName>("overall")

  // Defer mounting so Radix DropdownMenu's useId-generated trigger ID is
  // only produced client-side. Otherwise any upstream SSR/CSR tree difference
  // shifts the React 19 useId counter and the server-rendered id won't match
  // the client-expected id, throwing a hydration warning.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render on assistant page (has its own input interface)
  const isAssistantPage = pathname === "/assistant"

  // Check if user is on the correct page for a specific tour
  const isOnCorrectPage = (tourName: TourName): boolean => {
    const targetPathname = TOUR_PATHNAMES[tourName]
    if (pathname !== targetPathname) return false

    // Tab-scoped tours (incomes, expenses, cpf, holdings) also need the right
    // ?tab= param. The /user Overview tab is the default, so tours without an
    // entry here just need the pathname to match.
    const requiredTab = TOUR_TABS[tourName]
    if (requiredTab) {
      return searchParams.get("tab") === requiredTab
    }

    return true
  }

  // Keep ref updated
  useEffect(() => {
    startTourRef.current = startTour
  }, [startTour])

  // Check for new user tour (after onboarding completion)
  useEffect(() => {
    const checkNewUserTour = () => {
      const isNewUser = sessionStorage.getItem(NEW_USER_TOUR_KEY)
      if (isNewUser && pathname === "/overview") {
        console.log("[Tour] New user detected, showing welcome modal")
        sessionStorage.removeItem(NEW_USER_TOUR_KEY)
        setWelcomeModalTour("overall")
        setShowWelcomeModal(true)
      }
    }

    // Small delay to ensure page is ready
    const timer = setTimeout(checkNewUserTour, 300)
    return () => clearTimeout(timer)
  }, [pathname])

  // Check for pending tour after navigation
  useEffect(() => {
    // Reset the flag when pathname or searchParams change
    hasStartedPendingTour.current = false

    const checkAndStartTour = () => {
      if (hasStartedPendingTour.current) return

      const storedTour = sessionStorage.getItem(
        PENDING_TOUR_KEY
      ) as TourName | null
      const targetPathname = storedTour ? TOUR_PATHNAMES[storedTour] : null
      const currentTab = searchParams.get("tab")

      if (storedTour && pathname === targetPathname) {
        // Tab-scoped tours must also be on the right /user tab before starting.
        const requiredTab = TOUR_TABS[storedTour]
        if (requiredTab && currentTab !== requiredTab) {
          return
        }

        console.log("[Tour] Starting tour:", storedTour)
        // Clear the stored tour
        sessionStorage.removeItem(PENDING_TOUR_KEY)
        hasStartedPendingTour.current = true
        // Start the tour
        startTourRef.current(storedTour)
      }
    }

    // Try multiple times to ensure page is ready
    const timers = [
      setTimeout(checkAndStartTour, 500),
      setTimeout(checkAndStartTour, 1000),
      setTimeout(checkAndStartTour, 1500)
    ]

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [pathname, searchParams])

  const handleTourClick = (tourName: TourName) => {
    // Always show welcome modal first for all tours
    if (isOnCorrectPage(tourName)) {
      setWelcomeModalTour(tourName)
      setShowWelcomeModal(true)
    } else {
      // User is on a different page, show navigation confirmation
      setPendingTour(tourName)
      setShowConfirmDialog(true)
    }
  }

  const handleWelcomeGetStarted = () => {
    setShowWelcomeModal(false)
    // Small delay to let modal close animation finish
    setTimeout(() => {
      startTour(welcomeModalTour)
    }, 150)
  }

  const handleConfirmNavigation = () => {
    if (pendingTour) {
      // Navigate to the target page and show welcome modal after navigation
      console.log(
        "[Tour] Navigating to",
        TOUR_PAGE_NAMES[pendingTour],
        "for",
        pendingTour,
        "tour"
      )
      const targetRoute = TOUR_ROUTES[pendingTour]
      const tourToShow = pendingTour
      router.push(targetRoute)
      // Show welcome modal after navigation
      setTimeout(() => {
        setWelcomeModalTour(tourToShow)
        setShowWelcomeModal(true)
      }, 500)
    }
    setShowConfirmDialog(false)
    setPendingTour(null)
  }

  const handleCancelNavigation = () => {
    setShowConfirmDialog(false)
    setPendingTour(null)
  }

  // Don't render on assistant page, or before client mount (see comment above)
  if (isAssistantPage || !mounted) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="bg-background/95 hover:bg-accent desktop:bottom-6 fixed right-6 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-lg backdrop-blur-sm"
            aria-label="Help & Tours"
            data-tour="help-button">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Guided Tours</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleTourClick("overall")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <Compass className="mr-2 h-4 w-4" />
            App Overview
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("dashboard")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("incomes")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <DollarSign className="mr-2 h-4 w-4" />
            Incomes Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("expenses")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <Receipt className="mr-2 h-4 w-4" />
            Expenses Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("cpf")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <Landmark className="mr-2 h-4 w-4" />
            CPF Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("holdings")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <Wallet className="mr-2 h-4 w-4" />
            Net Worth Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("goals")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <Target className="mr-2 h-4 w-4" />
            Goals Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("budget")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <Calculator className="mr-2 h-4 w-4" />
            Budget Tour
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push("/onboarding-preview")}
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <GraduationCap className="mr-2 h-4 w-4" />
            Onboarding View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/mobile-guide")}
            data-tour="mobile-guide-btn"
            className="hover:bg-accent focus:bg-accent cursor-pointer transition-colors">
            <Smartphone className="mr-2 h-4 w-4" />
            Install on iPhone
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Navigate to {pendingTour ? TOUR_PAGE_NAMES[pendingTour] : ""}{" "}
              page?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This tour requires you to be on the{" "}
              {pendingTour ? TOUR_PAGE_NAMES[pendingTour] : ""} page. You will
              be redirected there to start the guided tour.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>
              Go to {pendingTour ? TOUR_PAGE_NAMES[pendingTour] : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WelcomeHeroModal
        open={showWelcomeModal}
        onOpenChange={setShowWelcomeModal}
        onGetStarted={handleWelcomeGetStarted}
        tourName={welcomeModalTour}
      />
    </>
  )
}
