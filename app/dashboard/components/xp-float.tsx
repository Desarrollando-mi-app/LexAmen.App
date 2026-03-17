"use client";

import { useEffect, useState } from "react";

interface XpFloatProps {
  amount: number;
  visible: boolean;
  onComplete?: () => void;
}

export function XpFloat({ amount, visible, onComplete }: XpFloatProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!show || amount <= 0) return null;

  return (
    <span className="inline-block animate-xp-float font-ibm-mono text-[14px] font-bold text-gz-gold pointer-events-none">
      +{amount} XP
    </span>
  );
}
