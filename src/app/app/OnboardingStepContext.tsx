"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type OnboardingStepContextValue = { step: number; setStep: (n: number) => void };

const OnboardingStepContext = createContext<OnboardingStepContextValue | null>(null);

export function OnboardingStepProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  return (
    <OnboardingStepContext.Provider value={{ step, setStep }}>
      {children}
    </OnboardingStepContext.Provider>
  );
}

export function useOnboardingStep(): OnboardingStepContextValue | null {
  return useContext(OnboardingStepContext);
}

export const ONBOARDING_STEP_LABELS = ["Business", "Agent", "Customize", "Test", "Activate"] as const;
