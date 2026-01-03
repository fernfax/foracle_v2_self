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

  const startTour = useCallback((tourName: TourName) => {
    const config = TOUR_CONFIGS[tourName];
    if (!config) return;

    // Small delay to ensure elements are rendered
    setTimeout(() => {
      // Filter steps to only include those with existing elements
      const validSteps = config.steps.filter((step) => {
        if (!step.element) return true;
        const element = document.querySelector(step.element as string);
        return element !== null;
      });

      if (validSteps.length === 0) {
        console.warn(`No valid elements found for tour: ${tourName}`);
        return;
      }

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
    }, 100);
  }, []);

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
