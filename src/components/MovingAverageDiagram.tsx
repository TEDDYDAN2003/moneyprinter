"use client";
import React from "react";
import { MovingAverageChart } from "@/components/MovingAverageChart";
type Variant = "bullish" | "bearish" | "range" | "overload" | "noise";
export function MovingAverageDiagram({ variant }: { variant: Variant }) {
  return <MovingAverageChart approach={variant === "bullish" || variant === "bearish" ? "crossover" : variant} direction={variant === "bearish" ? "bearish" : "bullish"} />;
}
