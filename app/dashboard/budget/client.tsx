"use client";

import { useState } from "react";
import {
  Target,
  TrendingUp,
  DollarSign,
  Wallet,
  ChevronLeft,
  Check,
  Utensils,
  Film,
  ShoppingBag,
  Car,
  Zap,
  MoreHorizontal,
  Delete,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PhoneScreen = "dashboard" | "add-expense" | "goals";

const categories = [
  { id: "food", label: "Food", icon: Utensils, color: "bg-orange-400" },
  { id: "entertainment", label: "Fun", icon: Film, color: "bg-purple-500" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, color: "bg-rose-500" },
  { id: "transport", label: "Transport", icon: Car, color: "bg-blue-500" },
  { id: "utilities", label: "Utilities", icon: Zap, color: "bg-amber-500" },
  { id: "other", label: "Other", icon: MoreHorizontal, color: "bg-slate-400" },
];

export function BudgetClient() {
  const [activeScreen, setActiveScreen] = useState<PhoneScreen>("dashboard");
  const [amount, setAmount] = useState("0");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const monthlyLimit = "$2,500.00";
  const spent = "$1,840.00";

  const handleNumberPress = (num: string) => {
    if (num === "." && amount.includes(".")) return;
    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else {
      // Limit to 2 decimal places
      const parts = amount.split(".");
      if (parts[1] && parts[1].length >= 2) return;
      setAmount(amount + num);
    }
  };

  const handleDelete = () => {
    if (amount.length === 1) {
      setAmount("0");
    } else {
      setAmount(amount.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    // Reset and go back
    setAmount("0");
    setSelectedCategory(null);
    setActiveScreen("dashboard");
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6 md:p-10 [perspective:1200px] overflow-hidden">
      <div className="relative w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

        {/* Left Side: Branding/Copy */}
        <div className="flex-1 space-y-6 z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider">
            <Target size={14} />
            Coming Soon
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1]">
            Track every penny, <br />
            <span className="text-indigo-600">Stress-free.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-md mx-auto lg:mx-0 leading-relaxed">
            Stop wondering where your money went. Set smart limits and get notified before you overspend.
          </p>
          <div className="flex flex-wrap gap-4 pt-4 justify-center lg:justify-start">
            <button
              className="px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95 cursor-not-allowed opacity-80"
              disabled
            >
              Get Notified
            </button>
            <button
              className="px-8 py-3.5 bg-white text-slate-900 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-not-allowed opacity-80"
              disabled
            >
              Learn More
            </button>
          </div>
          <p className="text-sm text-slate-400 pt-2">
            We're working hard to bring you the best budgeting experience.
          </p>
        </div>

        {/* Right Side: Phone Mockup */}
        <div className="flex-1 relative group py-8 lg:py-12">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-50 blur-[120px] rounded-full opacity-40 group-hover:opacity-80 transition-opacity duration-1000" />

          {/* Phone Frame with 3D Transform */}
          <div className="relative transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] transform-gpu
            group-hover:[transform:rotateX(0deg)_rotateZ(0deg)_rotateY(0deg)] group-hover:scale-105
            [transform:rotateX(48deg)_rotateZ(38deg)_rotateY(-12deg)]
            shadow-[25px_50px_100px_rgba(15,23,42,0.2)]
            group-hover:shadow-[0_40px_80px_rgba(15,23,42,0.1)]
            rounded-[2.8rem] border-[10px] border-slate-950 bg-slate-950 p-[2px] overflow-visible w-fit mx-auto"
          >
            {/* Phone Screen */}
            <div className="bg-white w-[260px] sm:w-[280px] h-[540px] sm:h-[600px] rounded-[2.1rem] overflow-hidden relative flex flex-col font-sans">

              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-950 rounded-full z-20" />

              {/* Screen Content Container */}
              <div className="flex-1 relative overflow-hidden">
                {/* Dashboard Screen */}
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-300 ease-out",
                    activeScreen === "dashboard"
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-full opacity-0"
                  )}
                >
                  <DashboardScreen monthlyLimit={monthlyLimit} spent={spent} />
                </div>

                {/* Add Expense Screen */}
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-300 ease-out",
                    activeScreen === "add-expense"
                      ? "translate-x-0 opacity-100"
                      : "translate-x-full opacity-0"
                  )}
                >
                  <AddExpenseScreen
                    amount={amount}
                    selectedCategory={selectedCategory}
                    onNumberPress={handleNumberPress}
                    onDelete={handleDelete}
                    onCategorySelect={setSelectedCategory}
                    onBack={() => setActiveScreen("dashboard")}
                    onConfirm={handleConfirm}
                  />
                </div>

                {/* Goals Screen */}
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-300 ease-out",
                    activeScreen === "goals"
                      ? "translate-x-0 opacity-100"
                      : "translate-x-full opacity-0"
                  )}
                >
                  <GoalsScreen />
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="h-14 sm:h-16 border-t border-slate-100 flex items-center justify-around px-6 relative bg-white">
                <button
                  onClick={() => setActiveScreen("dashboard")}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    activeScreen === "dashboard"
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-300 hover:text-slate-500"
                  )}
                >
                  <TrendingUp size={20} />
                </button>
                <button
                  onClick={() => setActiveScreen("add-expense")}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    activeScreen === "add-expense"
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-300 hover:text-slate-500"
                  )}
                >
                  <DollarSign size={20} />
                </button>
                <button
                  onClick={() => setActiveScreen("goals")}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    activeScreen === "goals"
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-300 hover:text-slate-500"
                  )}
                >
                  <Target size={20} />
                </button>
                {/* iOS Home Bar */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Floating Alert Card - Only show on dashboard */}
              <div
                className={cn(
                  "absolute top-1/2 -right-8 sm:-right-12 w-32 sm:w-36 bg-white rounded-2xl shadow-2xl p-3 sm:p-4 border border-slate-50 transition-all duration-700 delay-100",
                  activeScreen === "dashboard"
                    ? "group-hover:translate-x-4 sm:group-hover:translate-x-6 group-hover:-translate-y-4 opacity-100"
                    : "translate-x-20 opacity-0"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Alert</span>
                </div>
                <p className="text-[10px] leading-tight font-medium text-slate-600">
                  90% of Shopping limit reached.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Screen Component
function DashboardScreen({ monthlyLimit, spent }: { monthlyLimit: string; spent: string }) {
  return (
    <div className="pt-9 p-4 sm:p-5 space-y-3 sm:space-y-4 h-full flex flex-col">
      {/* Header - positioned below the island */}
      <div className="flex items-center gap-3 mt-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
          <Wallet size={18} />
        </div>
        <div>
          <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Monthly Budget</p>
          <p className="text-base font-bold text-slate-900">{monthlyLimit}</p>
        </div>
      </div>

      {/* Progress Circle */}
      <div className="relative h-32 sm:h-36 flex items-center justify-center">
        <svg className="w-28 sm:w-32 h-28 sm:h-32 transform -rotate-90">
          <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
          <circle cx="50%" cy="50%" r="42%" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="330" strokeDashoffset="86" className="text-indigo-600" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold text-slate-400">Spent</span>
          <span className="text-lg font-black text-slate-900">{spent}</span>
          <span className="text-[8px] font-bold text-emerald-500 mt-0.5">74% Used</span>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2.5 flex-1">
        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Top Spending</p>
        {[
          { label: "Food & Drinks", val: "75%", color: "bg-orange-400" },
          { label: "Entertainment", val: "40%", color: "bg-purple-500" },
          { label: "Shopping", val: "92%", color: "bg-rose-500" }
        ].map((cat, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold">
              <span className="text-slate-600">{cat.label}</span>
              <span className="text-slate-900">{cat.val}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: cat.val }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Add Expense Screen Component
function AddExpenseScreen({
  amount,
  selectedCategory,
  onNumberPress,
  onDelete,
  onCategorySelect,
  onBack,
  onConfirm,
}: {
  amount: string;
  selectedCategory: string | null;
  onNumberPress: (num: string) => void;
  onDelete: () => void;
  onCategorySelect: (id: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const formattedAmount = parseFloat(amount || "0").toLocaleString("en-US", {
    minimumFractionDigits: amount.includes(".") ? amount.split(".")[1]?.length || 0 : 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="pt-12 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Add Expense</p>
        <div className="w-8" />
      </div>

      {/* Amount Display */}
      <div className="text-center py-3">
        <span className="text-3xl font-black text-slate-900">${formattedAmount}</span>
      </div>

      {/* Category Selection */}
      <div className="mb-3">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category</p>
        <div className="grid grid-cols-3 gap-1.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategorySelect(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                  isSelected
                    ? "bg-indigo-50 ring-2 ring-indigo-600"
                    : "bg-slate-50 hover:bg-slate-100"
                )}
              >
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", cat.color)}>
                  <Icon size={12} className="text-white" />
                </div>
                <span className="text-[8px] font-bold text-slate-600">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Number Pad */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="grid grid-cols-3 gap-1.5">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((key) => (
            <button
              key={key}
              onClick={() => key === "del" ? onDelete() : onNumberPress(key)}
              className={cn(
                "h-11 rounded-xl font-bold text-base transition-all active:scale-95",
                key === "del"
                  ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  : "bg-slate-50 text-slate-900 hover:bg-slate-100"
              )}
            >
              {key === "del" ? <Delete size={16} className="mx-auto" /> : key}
            </button>
          ))}
        </div>

        {/* Confirm Button */}
        <button
          onClick={onConfirm}
          disabled={amount === "0" || !selectedCategory}
          className={cn(
            "mt-2 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
            amount !== "0" && selectedCategory
              ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          <Check size={16} />
          Add Expense
        </button>
      </div>
    </div>
  );
}

// Goals Screen Component
function GoalsScreen() {
  const goals = [
    { label: "Emergency Fund", current: 8500, target: 10000, color: "bg-emerald-500" },
    { label: "Vacation", current: 1200, target: 3000, color: "bg-blue-500" },
    { label: "New Laptop", current: 800, target: 2000, color: "bg-purple-500" },
  ];

  return (
    <div className="pt-12 p-4 sm:p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Target size={18} />
        </div>
        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Savings Goals</p>
        <div className="w-9" />
      </div>

      {/* Total Saved */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 mb-4 text-white">
        <p className="text-[9px] uppercase font-bold opacity-80 tracking-wider">Total Saved</p>
        <p className="text-2xl font-black">$10,500</p>
        <p className="text-[9px] opacity-70 mt-1">Across 3 goals</p>
      </div>

      {/* Goals List */}
      <div className="space-y-3 flex-1">
        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Active Goals</p>
        {goals.map((goal, i) => {
          const progress = (goal.current / goal.target) * 100;
          return (
            <div key={i} className="bg-slate-50 rounded-xl p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-700">{goal.label}</span>
                <span className="text-[9px] font-bold text-slate-500">
                  ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${goal.color} rounded-full transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[8px] font-bold text-slate-400 mt-1.5">{Math.round(progress)}% complete</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
