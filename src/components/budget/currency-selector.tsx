"use client"

import { useEffect, useState } from "react"
import { getExchangeRates } from "@/actions/currency"
import { RefreshCw, X } from "lucide-react"

import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type ExchangeRates
} from "@/lib/currency-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

interface CurrencySelectorProps {
  selectedCurrency: CurrencyCode
  onCurrencyChange: (currency: CurrencyCode, rate: number) => void
  customRate?: number
  onCustomRateChange?: (rate: number | undefined) => void
}

const CURRENCY_LIST = Object.entries(SUPPORTED_CURRENCIES) as [
  CurrencyCode,
  { symbol: string; name: string }
][]

export function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  customRate,
  onCustomRateChange
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false)
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingRate, setEditingRate] = useState(false)
  const [tempRate, setTempRate] = useState("")

  // Fetch rates when drawer opens
  useEffect(() => {
    if (open && !rates) {
      fetchRates()
    }
  }, [open])

  const fetchRates = async () => {
    setLoading(true)
    try {
      const fetchedRates = await getExchangeRates()
      setRates(fetchedRates)
    } catch (error) {
      console.error("Failed to fetch rates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCurrencySelect = (currency: CurrencyCode) => {
    const rate = currency === "SGD" ? 1 : rates?.rates[currency] || 1
    onCurrencyChange(currency, rate)
    onCustomRateChange?.(undefined) // Reset custom rate when changing currency
    setEditingRate(false)
    setOpen(false)
  }

  const handleEditRate = () => {
    const currentRate = customRate || rates?.rates[selectedCurrency] || 1
    setTempRate(currentRate.toFixed(4))
    setEditingRate(true)
  }

  const handleSaveRate = () => {
    const newRate = parseFloat(tempRate)
    if (!isNaN(newRate) && newRate > 0) {
      onCustomRateChange?.(newRate)
      onCurrencyChange(selectedCurrency, newRate)
    }
    setEditingRate(false)
  }

  const handleResetRate = () => {
    onCustomRateChange?.(undefined)
    const originalRate = rates?.rates[selectedCurrency] || 1
    onCurrencyChange(selectedCurrency, originalRate)
    setEditingRate(false)
  }

  const currentRate = customRate || rates?.rates[selectedCurrency] || 1
  const currencyInfo = SUPPORTED_CURRENCIES[selectedCurrency]

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-primary touch-manipulation gap-1"
        onClick={() => setOpen(true)}>
        <span className="font-medium">{currencyInfo.symbol}</span>
        <span className="text-muted-foreground text-xs">
          {selectedCurrency}
        </span>
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="flex-1 text-center text-lg font-semibold">
              Select Currency
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={fetchRates}
              disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </DrawerHeader>

          <DrawerBody>
            {/* Rate info for selected currency */}
            {selectedCurrency !== "SGD" && (
              <div className="bg-muted/50 mb-4 rounded-lg p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Exchange Rate (1 {selectedCurrency} = SGD)
                  </span>
                  {!editingRate ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleEditRate}>
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleResetRate}>
                      Reset
                    </Button>
                  )}
                </div>
                {editingRate ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      value={tempRate}
                      onChange={(e) => setTempRate(e.target.value)}
                      className="h-9"
                    />
                    <Button size="sm" onClick={handleSaveRate}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="text-lg font-semibold">
                    {currentRate.toFixed(4)}
                    {customRate && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (Custom)
                      </span>
                    )}
                  </div>
                )}
                {rates?.date && (
                  <div className="text-muted-foreground mt-1 text-xs">
                    Last updated: {rates.date}
                  </div>
                )}
              </div>
            )}

            {/* Currency list */}
            <div className="divide-y">
              {CURRENCY_LIST.map(([code, info]) => {
                const rate = code === "SGD" ? 1 : rates?.rates[code] || null
                const isSelected = code === selectedCurrency

                return (
                  <button
                    key={code}
                    className={cn(
                      "hover:bg-muted/50 flex w-full items-center justify-between px-2 py-3 transition-colors",
                      isSelected && "bg-primary/10"
                    )}
                    onClick={() => handleCurrencySelect(code)}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-lg font-medium">
                        {info.symbol}
                      </span>
                      <div className="text-left">
                        <div className="font-medium">{code}</div>
                        <div className="text-muted-foreground text-sm">
                          {info.name}
                        </div>
                      </div>
                    </div>
                    {code !== "SGD" && rate && (
                      <div className="text-muted-foreground text-sm">
                        1 {code} = S${rate.toFixed(4)}
                      </div>
                    )}
                    {isSelected && (
                      <div className="bg-primary ml-2 h-2 w-2 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            {loading && (
              <div className="text-muted-foreground py-4 text-center">
                Loading exchange rates...
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
