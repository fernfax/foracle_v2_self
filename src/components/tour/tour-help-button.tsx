"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { usePathname, useRouter } from "next/navigation"
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
import { Fab } from "@/components/ui/fab-stack"
import { useTourContext } from "@/components/tour/tour-provider"
import { TourWelcomeHeroModal } from "@/components/tour/tour-welcome-hero-modal"

const PENDING_TOUR_KEY = "foracle_pending_tour"
const NEW_USER_TOUR_KEY = "foracle_new_user_tour"

// Mount gate: `false` during SSR and first client paint, `true` afterwards.
const emptySubscribe = () => () => {}

// Map tours to their target pages (pathname only, no query params)
const TOUR_PATHNAMES: Record<TourName, string> = {
  overall: "/overview",
  dashboard: "/overview",
  incomes: "/user/incomes",
  expenses: "/user/expenses",
  cpf: "/user/cpf",
  holdings: "/user/holdings",
  goals: "/goals/active",
  budget: "/budget"
}

// Navigation targets. Each tab tour is its own route now, so the pathname fully
// identifies the tour's page — no ?tab= matching needed.
const TOUR_ROUTES: Record<TourName, string> = {
  overall: "/overview",
  dashboard: "/overview",
  incomes: "/user/incomes",
  expenses: "/user/expenses",
  cpf: "/user/cpf",
  holdings: "/user/holdings",
  goals: "/goals/active",
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

export function TourHelpButton() {
  const { startTour } = useTourContext()
  const pathname = usePathname()
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
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  // Don't render on assistant page (has its own input interface)
  const isAssistantPage = pathname === "/assistant"

  // Check if user is on the correct page for a specific tour
  const isOnCorrectPage = (tourName: TourName): boolean => {
    return pathname === TOUR_PATHNAMES[tourName]
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
    // Reset the flag when the pathname changes
    hasStartedPendingTour.current = false

    const checkAndStartTour = () => {
      if (hasStartedPendingTour.current) return

      const storedTour = sessionStorage.getItem(
        PENDING_TOUR_KEY
      ) as TourName | null
      const targetPathname = storedTour ? TOUR_PATHNAMES[storedTour] : null

      if (storedTour && pathname === targetPathname) {
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
  }, [pathname])

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
        {/* order 0 — the help button anchors the bottom-right FAB stack. */}
        <Fab order={0}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/95 hover:bg-accent rounded-full shadow-lg backdrop-blur-sm"
              aria-label="Help & Tours"
              data-tour="help-button">
              <HelpCircle className="size-5" />
            </Button>
          </DropdownMenuTrigger>
        </Fab>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Guided Tours</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleTourClick("overall")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <Compass className="mr-2 size-4" />
            App Overview
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("dashboard")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("incomes")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <DollarSign className="mr-2 size-4" />
            Incomes Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("expenses")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <Receipt className="mr-2 size-4" />
            Expenses Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("cpf")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <Landmark className="mr-2 size-4" />
            CPF Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("holdings")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <Wallet className="mr-2 size-4" />
            Net Worth Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("goals")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <Target className="mr-2 size-4" />
            Goals Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("budget")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <Calculator className="mr-2 size-4" />
            Budget Tour
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push("/onboarding-preview")}
            className="hover:bg-accent focus:bg-accent transition-colors">
            <GraduationCap className="mr-2 size-4" />
            Onboarding View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/mobile-guide")}
            data-tour="mobile-guide-btn"
            className="hover:bg-accent focus:bg-accent transition-colors">
            <Smartphone className="mr-2 size-4" />
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

      <TourWelcomeHeroModal
        open={showWelcomeModal}
        onOpenChange={setShowWelcomeModal}
        onGetStarted={handleWelcomeGetStarted}
        tourName={welcomeModalTour}
      />
    </>
  )
}
