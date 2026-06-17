"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react"
import { driver, type Driver } from "driver.js"

import "driver.js/dist/driver.css"
import "@/app/driver-theme.css"

import {
  getTourStatus,
  markTourCompleted,
  type TourStatus
} from "@/actions/tour"

import { emptyTourStatus } from "@/lib/api-schemas/user-prefs"
import { TOUR_CONFIGS, type TourName } from "@/lib/tour/tour-config"

/**
 * A tour step is only worth showing if its target is actually VISIBLE on the
 * current viewport — not merely present in the DOM. This is what lets one tour
 * definition adapt across desktop/mobile and empty states without branching:
 *   • the desktop sidebar is absent from the DOM on phones,
 *   • the mobile bottom nav is `display:none` on desktop,
 *   • the Budget page renders two parallel layouts (one hidden per breakpoint),
 *   • empty pages drop their data cards entirely.
 * A plain `querySelector !== null` check keeps hidden/zero-size anchors, and
 * driver.js then spotlights an invisible box or shows an orphaned popover.
 */
function isElementVisible(el: Element): boolean {
  const htmlEl = el as HTMLElement
  if (htmlEl.offsetParent === null) {
    const style = window.getComputedStyle(htmlEl)
    // offsetParent is also null for position:fixed, so only bail when the
    // element is genuinely hidden; otherwise fall through to the size check.
    if (style.display === "none" || style.visibility === "hidden") return false
  }
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function visibleSteps(tourName: TourName) {
  return TOUR_CONFIGS[tourName].steps.filter((step) => {
    if (!step.element) return true // element-less (modal) steps always count
    const el = document.querySelector(step.element as string)
    return el !== null && isElementVisible(el)
  })
}

interface TourContextType {
  startTour: (name: TourName) => void
  checkAndStartTour: (name: TourName) => void
  tourStatus: TourStatus
  isRunning: boolean
  currentTour: TourName | null
}

const TourContext = createContext<TourContextType | null>(null)

interface TourProviderProps {
  children: ReactNode
  userId: string
}

export function TourProvider({ children, userId }: TourProviderProps) {
  const [tourStatus, setTourStatus] = useState<TourStatus>(emptyTourStatus())
  const [isRunning, setIsRunning] = useState(false)
  const [currentTour, setCurrentTour] = useState<TourName | null>(null)
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load tour status on mount
  useEffect(() => {
    async function loadStatus() {
      const status = await getTourStatus()
      setTourStatus(status)
      setIsLoaded(true)
    }
    loadStatus()
  }, [userId])

  const startTourWithRetry = useCallback(
    (tourName: TourName, retryCount: number = 0) => {
      const config = TOUR_CONFIGS[tourName]
      if (!config) return

      const maxRetries = 15
      const retryDelay = 400

      // Only run steps whose target is actually visible on this viewport. This
      // both adapts the tour to desktop/mobile/empty-state layouts and prevents
      // orphaned popovers for elements that aren't on the page.
      const validSteps = visibleSteps(tourName)

      // Wait for at least one target to render before starting — pages stream in
      // async (Suspense, client hydration, chart mounts), so retry a few times.
      if (validSteps.length === 0) {
        if (retryCount < maxRetries) {
          setTimeout(
            () => startTourWithRetry(tourName, retryCount + 1),
            retryDelay
          )
          return
        }
        console.warn(
          `No visible elements found for tour: ${tourName} after ${maxRetries} retries`
        )
        return
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
          instance.destroy()
        },
        onNextClick: () => {
          // Check if this is the last step
          if (!instance.hasNextStep()) {
            instance.destroy()
          } else {
            instance.moveNext()
          }
        },
        onPrevClick: () => {
          instance.movePrevious()
        },
        onDestroyStarted: () => {
          setIsRunning(false)
          setCurrentTour(null)
        },
        onDestroyed: async () => {
          // Mark tour as completed
          await markTourCompleted(tourName)
          setTourStatus((prev) => ({
            ...prev,
            [tourName]: new Date().toISOString()
          }))
          setDriverInstance(null)
        }
      })

      setDriverInstance(instance)
      setIsRunning(true)
      setCurrentTour(tourName)
      instance.drive()
    },
    []
  )

  const startTour = useCallback(
    (tourName: TourName) => {
      // Start with a small initial delay, then retry if elements not found
      setTimeout(() => startTourWithRetry(tourName, 0), 100)
    },
    [startTourWithRetry]
  )

  const checkAndStartTour = useCallback(
    (tourName: TourName) => {
      if (!isLoaded) return

      // Only auto-start if tour hasn't been completed
      if (tourStatus[tourName] === null) {
        // Delay to allow page to fully render
        setTimeout(() => {
          startTour(tourName)
        }, 800)
      }
    },
    [isLoaded, tourStatus, startTour]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverInstance) {
        driverInstance.destroy()
      }
    }
  }, [driverInstance])

  return (
    <TourContext.Provider
      value={{
        startTour,
        checkAndStartTour,
        tourStatus,
        isRunning,
        currentTour
      }}>
      {children}
    </TourContext.Provider>
  )
}

export function useTourContext() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error("useTourContext must be used within a TourProvider")
  }
  return context
}
