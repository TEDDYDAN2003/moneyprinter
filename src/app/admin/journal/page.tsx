import { BookOpen, Clock, Percent, Shield, TrendingUp } from "lucide-react";

export default function JournalPage() {
  const previewMetrics = [
    { label: "Win Rate", value: "—", hint: "Calculated from closed trades", icon: Percent },
    { label: "Risk / Trade", value: "—", hint: "Planned risk exposure", icon: Shield },
    { label: "Active Stake", value: "—", hint: "Position sizing log", icon: TrendingUp },
    { label: "Logged Trades", value: "0", hint: "Awaiting journal schema", icon: Clock },
  ];

  const plannedColumns = [
    "Date / Pair",
    "Strategy",
    "Direction",
    "Stake",
    "Risk",
    "Opening Price",
    "Closing Price",
    "Result / Win Rate",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-400">
            Admin
          </span>
          <span className="text-slate-700">/</span>
          <span className="font-mono text-xs text-slate-400">Journal</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Trading Journal
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Workspace shell for recording trade executions, stake, risk,
              opening/closing prices, and cumulative win rate.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0E131B] px-3 py-1.5 font-mono text-xs text-slate-300">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            Ready for Specification
          </span>
        </div>
      </div>

      {/* Planned KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {previewMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-800/90 bg-[#0E131B] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  {metric.label}
                </span>
                <Icon className="h-4 w-4 text-emerald-400/80" />
              </div>
              <p className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                {metric.value}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{metric.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Table Structure Placeholder */}
      <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0E131B]">
        <div className="border-b border-slate-800/80 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            Execution Ledger Blueprint
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Columns prepared for your trading journal specification.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-[#090D13] font-mono text-[11px] uppercase tracking-wider text-slate-400">
                {plannedColumns.map((col) => (
                  <th key={col} className="px-4 py-3 font-medium whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={plannedColumns.length}
                  className="px-6 py-14 text-center"
                >
                  <div className="mx-auto max-w-md space-y-2">
                    <p className="text-sm font-medium text-slate-200">
                      Awaiting your Journal rules &amp; fields
                    </p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Share the exact fields, formulas, and workflows you want
                      on this page and we&apos;ll wire it directly into Supabase.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
