"use client";

import { Target, TrendingUp, DollarSign, Wallet } from "lucide-react";

export function BudgetClient() {
  const monthlyLimit = "$2,500.00";
  const spent = "$1,840.00";

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

              {/* App Content */}
              <div className="pt-12 p-5 sm:p-6 space-y-6 sm:space-y-8 flex-1">
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Wallet size={20} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Monthly Budget</p>
                    <p className="text-lg font-bold text-slate-900">{monthlyLimit}</p>
                  </div>
                </div>

                {/* Progress Circle */}
                <div className="relative h-36 sm:h-44 flex items-center justify-center">
                  <svg className="w-32 sm:w-36 h-32 sm:h-36 transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-50" />
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="402" strokeDashoffset="100" className="text-indigo-600" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-400">Spent</span>
                    <span className="text-xl font-black text-slate-900">{spent}</span>
                    <span className="text-[9px] font-bold text-emerald-500 mt-0.5">74% Used</span>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Top Spending</p>
                  {[
                    { label: "Food & Drinks", val: "75%", color: "bg-orange-400" },
                    { label: "Entertainment", val: "40%", color: "bg-purple-500" },
                    { label: "Shopping", val: "92%", color: "bg-rose-500" }
                  ].map((cat, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600">{cat.label}</span>
                        <span className="text-slate-900">{cat.val}</span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.color} rounded-full`} style={{ width: cat.val }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="h-14 sm:h-16 border-t border-slate-50 flex items-center justify-around px-6 relative">
                <div className="text-indigo-600"><TrendingUp size={20} /></div>
                <div className="text-slate-300"><DollarSign size={20} /></div>
                <div className="text-slate-300"><Target size={20} /></div>
                {/* iOS Home Bar */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Floating Alert Card */}
              <div className="absolute top-1/2 -right-8 sm:-right-12 w-32 sm:w-36 bg-white rounded-2xl shadow-2xl p-3 sm:p-4 border border-slate-50 transition-all duration-700 delay-100 group-hover:translate-x-4 sm:group-hover:translate-x-6 group-hover:-translate-y-4">
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
