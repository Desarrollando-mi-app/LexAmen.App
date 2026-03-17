"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { getAnimationsEnabled } from "@/lib/sounds";

interface XpFloatContextType {
  showXpFloat: (amount: number) => void;
}

const XpFloatContext = createContext<XpFloatContextType>({
  showXpFloat: () => {},
});

export function useXpFloat() {
  return useContext(XpFloatContext);
}

interface FloatEntry {
  id: number;
  amount: number;
}

let nextId = 0;

export function XpFloatProvider({ children }: { children: ReactNode }) {
  const [floats, setFloats] = useState<FloatEntry[]>([]);

  const showXpFloat = useCallback((amount: number) => {
    if (amount <= 0 || !getAnimationsEnabled()) return;
    const id = nextId++;
    setFloats((prev) => [...prev, { id, amount }]);
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 1300);
  }, []);

  return (
    <XpFloatContext.Provider value={{ showXpFloat }}>
      {children}
      {floats.length > 0 && (
        <div className="fixed top-20 right-6 z-[9997] flex flex-col items-end gap-1 pointer-events-none">
          {floats.map((f) => (
            <span
              key={f.id}
              className="animate-xp-float font-ibm-mono text-[16px] font-bold text-gz-gold"
            >
              +{f.amount} XP
            </span>
          ))}
        </div>
      )}
    </XpFloatContext.Provider>
  );
}
