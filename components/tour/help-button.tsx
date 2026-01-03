"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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

// Map tours to their target pages
const TOUR_ROUTES: Record<TourName, string> = {
  dashboard: "/dashboard",
  incomes: "/dashboard/user",
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
  const router = useRouter();

  const [pendingTour, setPendingTour] = useState<TourName | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Check for pending tour after navigation
  useEffect(() => {
    const storedTour = sessionStorage.getItem(PENDING_TOUR_KEY) as TourName | null;
    if (storedTour && TOUR_ROUTES[storedTour] === pathname) {
      // Clear the stored tour
      sessionStorage.removeItem(PENDING_TOUR_KEY);
      // Start the tour after a short delay for page to render
      setTimeout(() => {
        startTour(storedTour);
      }, 600);
    }
  }, [pathname, startTour]);

  const handleTourClick = (tourName: TourName) => {
    const targetRoute = TOUR_ROUTES[tourName];
    const isOnTargetPage = pathname === targetRoute;

    if (isOnTargetPage) {
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
