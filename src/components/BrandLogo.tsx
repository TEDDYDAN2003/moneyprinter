import React from "react";

interface BrandLogoProps {
  compact?: boolean;
  subtitle?: string;
}

export function BrandLogo({ compact = false, subtitle }: BrandLogoProps) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-emerald-400"
        >
          {/* Candlestick + upward precision bar mark */}
          <path
            d="M6 5V19M6 8H8V15H4V8H6Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.65"
          />
          <path
            d="M12 3V17M12 6H14V13H10V6H12Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 7V21M18 10H20V18H16V10H18Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-bold tracking-wider text-white uppercase">
              MoneyPrinter
            </span>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              EDGE
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] text-slate-400 leading-tight">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
