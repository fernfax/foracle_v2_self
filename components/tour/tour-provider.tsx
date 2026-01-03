"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/app/driver-theme.css";
import { type TourName, TOUR_CONFIGS } from "@/lib/tour/tour-config";
import {
  getTourStatus,
  markTourCompleted,
  type TourStatus,
} from "@/lib/actions/tour";

interface TourContextType {
  startTour: (name: TourName) => void;
  checkAndStartTour: (name: TourName) => void;
  tourStatus: TourStatus;
  isRunning: boolean;
  currentTour: TourName | null;
}

const TourContext = createContext<TourContextType | null>(null);

interface TourProviderProps {
  children: ReactNode;
  userId: string;
}

export function TourProvider({ children, userId }: TourProviderProps) {
  const [tourStatus, setTourStatus] = useState<TourStatus>({
    dashboard: null,
    incomes: null,
    expenses: null,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [currentTour, setCurrentTour] = useState<TourName | null>(null);
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tour status on mount
  useEffect(() => {
    async function loadStatus() {
      const status = await getTourStatus();
      setTourStatus(status);
      setIsLoaded(true);
    }
    loadStatus();
  }, [userId]);

  const startTourWithRetry = useCallback((tourName: TourName, retryCount: number = 0) => {
    const config = TOUR_CONFIGS[tourName];
    if (!config) return;

    const maxRetries = 15;
    const retryDelay = 400;

    // Filter steps to only include those with existing elements
    const validSteps = config.steps.filter((step) => {
      if (!step.element) return true;
      const element = document.querySelector(step.element as string);
      return element !== null;
    });

    // Log which elements were found/not found
    if (retryCount === 0 || validSteps.length === 0) {
      const allTourElements = document.querySelectorAll('[data-tour]');
      console.log(`[Tour] Found ${allTourElements.length} data-tour elements on page:`,
        Array.from(allTourElements).map(el => el.getAttribute('data-tour'))
      );
      console.log(`[Tour] Looking for:`, config.steps.map(s => s.element));
    }

    if (validSteps.length === 0) {
      if (retryCount < maxRetries) {
        console.log(`[Tour] Waiting for elements, retry ${retryCount + 1}/${maxRetries}...`);
        setTimeout(() => startTourWithRetry(tourName, retryCount + 1), retryDelay);
        return;
      }
      console.warn(`No valid elements found for tour: ${tourName} after ${maxRetries} retries`);
      return;
    }

    console.log(`[Tour] Starting ${tourName} with ${validSteps.length} steps`);

    const instance = driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayColor: "rgba(0, 0, 0, 0.7)",
        stagePadding: 12,
        stageRadius: 8,
        popoverClass: "foracle-tour-popover",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        steps: validSteps,
        onCloseClick: () => {
          instance.destroy();
        },
        onNextClick: () => {
          // Check if this is the last step
          if (!instance.hasNextStep()) {
            instance.destroy();
          } else {
            instance.moveNext();
          }
        },
        onPrevClick: () => {
          instance.movePrevious();
        },
        onDestroyStarted: () => {
          setIsRunning(false);
          setCurrentTour(null);
        },
        onDestroyed: async () => {
          // Mark tour as completed
          await markTourCompleted(tourName);
          setTourStatus((prev) => ({
            ...prev,
            [tourName]: new Date().toISOString(),
          }));
          setDriverInstance(null);
        },
      });

    setDriverInstance(instance);
    setIsRunning(true);
    setCurrentTour(tourName);
    instance.drive();
  }, []);

  const startTour = useCallback((tourName: TourName) => {
    // Start with a small initial delay, then retry if elements not found
    setTimeout(() => startTourWithRetry(tourName, 0), 100);
  }, [startTourWithRetry]);

  const checkAndStartTour = useCallback(
    (tourName: TourName) => {
      if (!isLoaded) return;

      // Only auto-start if tour hasn't been completed
      if (tourStatus[tourName] === null) {
        // Delay to allow page to fully render
        setTimeout(() => {
          startTour(tourName);
        }, 800);
      }
    },
    [isLoaded, tourStatus, startTour]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverInstance) {
        driverInstance.destroy();
      }
    };
  }, [driverInstance]);

  return (
    <TourContext.Provider
      value={{
        startTour,
        checkAndStartTour,
        tourStatus,
        isRunning,
        currentTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTourContext must be used within a TourProvider");
  }
  return context;
}
