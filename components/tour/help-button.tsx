"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, Compass, LayoutDashboard, DollarSign, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTourContext } from "./tour-provider";
import { WelcomeHeroModal } from "./welcome-hero-modal";
import { type TourName } from "@/lib/tour/tour-config";

const PENDING_TOUR_KEY = "foracle_pending_tour";

// Map tours to their target pages (pathname only, no query params)
const TOUR_PATHNAMES: Record<TourName, string> = {
  overall: "/dashboard",
  dashboard: "/dashboard",
  incomes: "/dashboard/user",
  expenses: "/dashboard/user/expenses",
};

// Full URLs including query params for navigation
const TOUR_ROUTES: Record<TourName, string> = {
  overall: "/dashboard",
  dashboard: "/dashboard",
  incomes: "/dashboard/user?tab=incomes",
  expenses: "/dashboard/user/expenses",
};

const TOUR_PAGE_NAMES: Record<TourName, string> = {
  overall: "Dashboard",
  dashboard: "Dashboard",
  incomes: "Incomes",
  expenses: "Expenses",
};

export function HelpButton() {
  const { startTour } = useTourContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const startTourRef = useRef(startTour);
  const hasStartedPendingTour = useRef(false);

  const [pendingTour, setPendingTour] = useState<TourName | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeModalTour, setWelcomeModalTour] = useState<TourName>("overall");

  // Check if user is on the correct page for a specific tour
  const isOnCorrectPage = (tourName: TourName): boolean => {
    const targetPathname = TOUR_PATHNAMES[tourName];
    if (pathname !== targetPathname) return false;

    // For incomes tour, also check the tab param
    if (tourName === "incomes") {
      const currentTab = searchParams.get("tab");
      return currentTab === "incomes";
    }

    return true;
  };

  // Keep ref updated
  useEffect(() => {
    startTourRef.current = startTour;
  }, [startTour]);

  // Check for pending tour after navigation
  useEffect(() => {
    // Reset the flag when pathname or searchParams change
    hasStartedPendingTour.current = false;

    const checkAndStartTour = () => {
      if (hasStartedPendingTour.current) return;

      const storedTour = sessionStorage.getItem(PENDING_TOUR_KEY) as TourName | null;
      const targetPathname = storedTour ? TOUR_PATHNAMES[storedTour] : null;
      const currentTab = searchParams.get("tab");
      console.log("[Tour] Checking pending tour:", { storedTour, pathname, targetPathname, currentTab });

      if (storedTour && pathname === targetPathname) {
        // For incomes tour, also verify we're on the incomes tab
        if (storedTour === "incomes" && currentTab !== "incomes") {
          console.log("[Tour] On correct path but wrong tab, waiting...");
          return;
        }

        console.log("[Tour] Starting tour:", storedTour);
        // Clear the stored tour
        sessionStorage.removeItem(PENDING_TOUR_KEY);
        hasStartedPendingTour.current = true;
        // Start the tour
        startTourRef.current(storedTour);
      }
    };

    // Try multiple times to ensure page is ready
    const timers = [
      setTimeout(checkAndStartTour, 500),
      setTimeout(checkAndStartTour, 1000),
      setTimeout(checkAndStartTour, 1500),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [pathname, searchParams]);

  const handleTourClick = (tourName: TourName) => {
    // Always show welcome modal first for all tours
    if (isOnCorrectPage(tourName)) {
      setWelcomeModalTour(tourName);
      setShowWelcomeModal(true);
    } else {
      // User is on a different page, show navigation confirmation
      setPendingTour(tourName);
      setShowConfirmDialog(true);
    }
  };

  const handleWelcomeGetStarted = () => {
    setShowWelcomeModal(false);
    // Small delay to let modal close animation finish
    setTimeout(() => {
      startTour(welcomeModalTour);
    }, 150);
  };

  const handleConfirmNavigation = () => {
    if (pendingTour) {
      // Navigate to the target page and show welcome modal after navigation
      console.log("[Tour] Navigating to", TOUR_PAGE_NAMES[pendingTour], "for", pendingTour, "tour");
      const targetRoute = TOUR_ROUTES[pendingTour];
      const tourToShow = pendingTour;
      router.push(targetRoute);
      // Show welcome modal after navigation
      setTimeout(() => {
        setWelcomeModalTour(tourToShow);
        setShowWelcomeModal(true);
      }, 500);
    }
    setShowConfirmDialog(false);
    setPendingTour(null);
  };

  const handleCancelNavigation = () => {
    setShowConfirmDialog(false);
    setPendingTour(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-24 right-6 z-40 rounded-full shadow-lg bg-background/95 backdrop-blur-sm hover:bg-accent md:bottom-6"
            aria-label="Help & Tours"
            data-tour="help-button"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Guided Tours</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleTourClick("overall")}
            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent"
          >
            <Compass className="mr-2 h-4 w-4" />
            App Overview
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("dashboard")}
            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("incomes")}
            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Incomes Tour
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTourClick("expenses")}
            className="cursor-pointer transition-colors hover:bg-accent focus:bg-accent"
          >
            <Receipt className="mr-2 h-4 w-4" />
            Expenses Tour
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Navigate to {pendingTour ? TOUR_PAGE_NAMES[pendingTour] : ""} page?</AlertDialogTitle>
            <AlertDialogDescription>
              This tour requires you to be on the {pendingTour ? TOUR_PAGE_NAMES[pendingTour] : ""} page.
              You will be redirected there to start the guided tour.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNavigation}>Cancel</AlertDialogCancel>
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
  );
}
