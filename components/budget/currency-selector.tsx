"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerBody,
} from "@/components/ui/drawer";
import { X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type ExchangeRates,
} from "@/lib/currency-utils";
import { getExchangeRates } from "@/lib/actions/currency";

interface CurrencySelectorProps {
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode, rate: number) => void;
  customRate?: number;
  onCustomRateChange?: (rate: number | undefined) => void;
}

const CURRENCY_LIST = Object.entries(SUPPORTED_CURRENCIES) as [CurrencyCode, { symbol: string; name: string }][];

export function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  customRate,
  onCustomRateChange,
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState("");

  // Fetch rates when drawer opens
  useEffect(() => {
    if (open && !rates) {
      fetchRates();
    }
  }, [open]);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const fetchedRates = await getExchangeRates();
      setRates(fetchedRates);
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencySelect = (currency: CurrencyCode) => {
    const rate = currency === "SGD" ? 1 : (rates?.rates[currency] || 1);
    onCurrencyChange(currency, rate);
    onCustomRateChange?.(undefined); // Reset custom rate when changing currency
    setEditingRate(false);
    setOpen(false);
  };

  const handleEditRate = () => {
    const currentRate = customRate || (rates?.rates[selectedCurrency] || 1);
    setTempRate(currentRate.toFixed(4));
    setEditingRate(true);
  };

  const handleSaveRate = () => {
    const newRate = parseFloat(tempRate);
    if (!isNaN(newRate) && newRate > 0) {
      onCustomRateChange?.(newRate);
      onCurrencyChange(selectedCurrency, newRate);
    }
    setEditingRate(false);
  };

  const handleResetRate = () => {
    onCustomRateChange?.(undefined);
    const originalRate = rates?.rates[selectedCurrency] || 1;
    onCurrencyChange(selectedCurrency, originalRate);
    setEditingRate(false);
  };

  const currentRate = customRate || (rates?.rates[selectedCurrency] || 1);
  const currencyInfo = SUPPORTED_CURRENCIES[selectedCurrency];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-primary touch-manipulation"
        onClick={() => setOpen(true)}
      >
        <span className="font-medium">{currencyInfo.symbol}</span>
        <span className="text-xs text-muted-foreground">{selectedCurrency}</span>
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
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </DrawerHeader>

          <DrawerBody>
            {/* Rate info for selected currency */}
            {selectedCurrency !== "SGD" && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Exchange Rate (1 {selectedCurrency} = SGD)
                  </span>
                  {!editingRate ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleEditRate}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleResetRate}
                    >
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
                      <span className="ml-2 text-xs text-orange-500">(Custom)</span>
                    )}
                  </div>
                )}
                {rates?.date && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Last updated: {rates.date}
                  </div>
                )}
              </div>
            )}

            {/* Currency list */}
            <div className="divide-y">
              {CURRENCY_LIST.map(([code, info]) => {
                const rate = code === "SGD" ? 1 : (rates?.rates[code] || null);
                const isSelected = code === selectedCurrency;

                return (
                  <button
                    key={code}
                    className={cn(
                      "w-full flex items-center justify-between py-3 px-2 hover:bg-muted/50 transition-colors",
                      isSelected && "bg-primary/10"
                    )}
                    onClick={() => handleCurrencySelect(code)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-lg font-medium">{info.symbol}</span>
                      <div className="text-left">
                        <div className="font-medium">{code}</div>
                        <div className="text-sm text-muted-foreground">{info.name}</div>
                      </div>
                    </div>
                    {code !== "SGD" && rate && (
                      <div className="text-sm text-muted-foreground">
                        1 {code} = S${rate.toFixed(4)}
                      </div>
                    )}
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className="text-center py-4 text-muted-foreground">
                Loading exchange rates...
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
