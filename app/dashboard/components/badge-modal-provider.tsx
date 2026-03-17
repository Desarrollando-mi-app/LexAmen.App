"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { BadgeEarnedModal } from "./badge-earned-modal";

interface BadgeData {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  tier: string;
}

interface BadgeModalContextType {
  showBadgeModal: (badge: BadgeData) => void;
}

const BadgeModalContext = createContext<BadgeModalContextType>({
  showBadgeModal: () => {},
});

export function useBadgeModal() {
  return useContext(BadgeModalContext);
}

export function BadgeModalProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<BadgeData | null>(null);
  const queueRef = useRef<BadgeData[]>([]);

  const showBadgeModal = useCallback((badge: BadgeData) => {
    setCurrent((prev) => {
      if (prev === null) {
        return badge;
      }
      queueRef.current.push(badge);
      return prev;
    });
  }, []);

  const handleClose = useCallback(() => {
    setCurrent(null);
    // Show next in queue after a short delay
    setTimeout(() => {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setCurrent(next);
      }
    }, 300);
  }, []);

  return (
    <BadgeModalContext.Provider value={{ showBadgeModal }}>
      {children}
      {current && (
        <BadgeEarnedModal
          visible={true}
          badge={current}
          onClose={handleClose}
        />
      )}
    </BadgeModalContext.Provider>
  );
}
