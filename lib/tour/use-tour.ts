"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { type TourName, TOUR_CONFIGS } from "./tour-config";
import { markTourCompleted } from "@/lib/actions/tour";

interface UseTourOptions {
  tourName: TourName;
  autoStart?: boolean;
  onComplete?: () => void;
}

interface UseTourReturn {
  startTour: () => void;
  isRunning: boolean;
}

export function useTour({
  tourName,
  autoStart = false,
  onComplete,
}: UseTourOptions): UseTourReturn {
  const [isRunning, setIsRunning] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const hasAutoStarted = useRef(false);

  const startTour = useCallback(() => {
    const config = TOUR_CONFIGS[tourName];
    if (!config) return;

    // Filter steps to only include those with existing elements
    const validSteps = config.steps.filter((step) => {
      if (!step.element) return true; // Non-element steps are always valid
      const element = document.querySelector(step.element as string);
      return element !== null;
    });

    if (validSteps.length === 0) return;

    const driverInstance = driver({
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
        driverInstance.destroy();
      },
      onNextClick: () => {
        if (!driverInstance.hasNextStep()) {
          driverInstance.destroy();
        } else {
          driverInstance.moveNext();
        }
      },
      onPrevClick: () => {
        driverInstance.movePrevious();
      },
      onDestroyStarted: () => {
        setIsRunning(false);
        driverRef.current = null;
      },
      onDestroyed: () => {
        // Mark tour as completed when user finishes or closes
        markTourCompleted(tourName);
        onComplete?.();
      },
    });

    driverRef.current = driverInstance;
    setIsRunning(true);
    driverInstance.drive();
  }, [tourName, onComplete]);

  // Auto-start the tour after a delay (if enabled)
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Delay to allow the page to render fully
      const timer = setTimeout(() => {
        startTour();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [autoStart, startTour]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  return { startTour, isRunning };
}
