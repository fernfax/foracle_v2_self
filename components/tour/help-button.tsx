"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, LayoutDashboard, DollarSign, Receipt } from "lucide-react";
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
import { type TourName } from "@/lib/tour/tour-config";

const PENDING_TOUR_KEY = "foracle_pending_tour";

// Map tours to their target pages (pathname only, no query params)
const TOUR_PATHNAMES: Record<TourName, string> = {
  dashboard: "/dashboard",
  incomes: "/dashboard/user",
  expenses: "/dashboard/user/expenses",
};

// Full URLs including query params for navigation
const TOUR_ROUTES: Record<TourName, string> = {
  dashboard: "/dashboard",
  incomes: "/dashboard/user?tab=incomes",
  expenses: "/dashboard/user/expenses",
};

const TOUR_PAGE_NAMES: Record<TourName, string> = {
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
    if (isOnCorrectPage(tourName)) {
      // User is already on the target page, start tour directly
      startTour(tourName);
    } else {
      // User is on a different page, show confirmation
      setPendingTour(tourName);
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingTour) {
      // Store the pending tour in sessionStorage to survive navigation
      console.log("[Tour] Storing pending tour:", pendingTour, "navigating to:", TOUR_ROUTES[pendingTour]);
      sessionStorage.setItem(PENDING_TOUR_KEY, pendingTour);
      const targetRoute = TOUR_ROUTES[pendingTour];
      router.push(targetRoute);
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
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Guided Tours</DropdownMenuLabel>
          <DropdownMenuSeparator />
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
    </>
  );
}
