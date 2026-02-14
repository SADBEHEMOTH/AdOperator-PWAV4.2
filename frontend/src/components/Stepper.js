import React from "react";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Produto", "Estratégia", "Anúncios", "Simulação", "Decisão"];

export default function Stepper({ currentStep = 0 }) {
  return (
    <div className="flex items-center justify-between w-full mb-12" data-testid="stepper">
      {STEP_LABELS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "rounded-full transition-all duration-300",
                i < currentStep
                  ? "w-3 h-3 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : i === currentStep
                  ? "w-3 h-3 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  : "w-2 h-2 bg-zinc-800"
              )}
            />
            <span
              className={cn(
                "text-xs font-mono uppercase tracking-widest transition-colors duration-300 hidden sm:block",
                i <= currentStep ? "text-zinc-300" : "text-zinc-700"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={cn(
                "h-[1px] flex-1 mx-3 sm:mx-4 transition-colors duration-300",
                i < currentStep ? "bg-emerald-400/30" : "bg-zinc-900"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
