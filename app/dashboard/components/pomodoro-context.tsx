"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ──────────────────────────────────────────────────

export type PomodoroFase = "trabajo" | "descanso_corto" | "descanso_largo";

export interface PomodoroConfig {
  trabajo: number;       // minutos
  descCorto: number;     // minutos
  descLargo: number;     // minutos
  sesionesAntes: number; // sesiones antes del descanso largo
}

interface PomodoroState {
  running: boolean;
  segundosRestantes: number;
  fase: PomodoroFase;
  sesionActual: number;
  timestamp: number;
}

interface PomodoroContextValue {
  config: PomodoroConfig;
  running: boolean;
  segundosRestantes: number;
  fase: PomodoroFase;
  sesionActual: number;
  showSettings: boolean;
  // Actions
  iniciar: () => void;
  pausar: () => void;
  reset: () => void;
  setShowSettings: (v: boolean) => void;
  updateConfig: (c: PomodoroConfig) => void;
}

// ─── Defaults ───────────────────────────────────────────────

const DEFAULT_CONFIG: PomodoroConfig = {
  trabajo: 25,
  descCorto: 5,
  descLargo: 15,
  sesionesAntes: 4,
};

const LS_CONFIG = "iuris_pomodoro_config";
const LS_STATE = "iuris_pomodoro_state";

// ─── Helpers ────────────────────────────────────────────────

function loadConfig(): PomodoroConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveConfig(c: PomodoroConfig) {
  try { localStorage.setItem(LS_CONFIG, JSON.stringify(c)); } catch { /* */ }
}

function loadState(config: PomodoroConfig): PomodoroState {
  const fresh: PomodoroState = {
    running: false,
    segundosRestantes: config.trabajo * 60,
    fase: "trabajo",
    sesionActual: 1,
    timestamp: Date.now(),
  };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (!raw) return fresh;
    const saved: PomodoroState = JSON.parse(raw);
    // Si estaba corriendo, calcular tiempo transcurrido
    if (saved.running && saved.timestamp) {
      const elapsed = Math.floor((Date.now() - saved.timestamp) / 1000);
      saved.segundosRestantes = Math.max(0, saved.segundosRestantes - elapsed);
      saved.timestamp = Date.now();
    }
    return saved;
  } catch { /* ignore */ }
  return fresh;
}

function saveState(s: PomodoroState) {
  try { localStorage.setItem(LS_STATE, JSON.stringify({ ...s, timestamp: Date.now() })); } catch { /* */ }
}

const FASE_LABELS: Record<PomodoroFase, string> = {
  trabajo: "Trabajo",
  descanso_corto: "Descanso corto",
  descanso_largo: "Descanso largo",
};

function playCompletionTone() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* */ }
}

function sendNotification(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

// ─── Context ────────────────────────────────────────────────

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be inside PomodoroProvider");
  return ctx;
}

export { FASE_LABELS };

// ─── Provider ───────────────────────────────────────────────

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PomodoroConfig>(() => loadConfig());
  const [running, setRunning] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(config.trabajo * 60);
  const [fase, setFase] = useState<PomodoroFase>("trabajo");
  const [sesionActual, setSesionActual] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef("");

  // ─── Hydrate from localStorage ───────────────────────────
  useEffect(() => {
    const saved = loadState(config);
    setRunning(saved.running);
    setSegundosRestantes(saved.segundosRestantes);
    setFase(saved.fase);
    setSesionActual(saved.sesionActual);
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Get total seconds for a phase ───────────────────────
  const getTotalSeconds = useCallback(
    (f: PomodoroFase) => {
      switch (f) {
        case "trabajo": return config.trabajo * 60;
        case "descanso_corto": return config.descCorto * 60;
        case "descanso_largo": return config.descLargo * 60;
      }
    },
    [config]
  );

  // ─── Handle phase completion ─────────────────────────────
  const handlePhaseComplete = useCallback(() => {
    playCompletionTone();

    if (fase === "trabajo") {
      const newSesion = sesionActual + 1;
      const nextFase: PomodoroFase =
        (sesionActual % config.sesionesAntes === 0) ? "descanso_largo" : "descanso_corto";
      setSesionActual(newSesion);
      setFase(nextFase);
      setSegundosRestantes(getTotalSeconds(nextFase));
      sendNotification("Pomodoro completado", `Sesión ${sesionActual} terminada. ${FASE_LABELS[nextFase]}.`);
    } else {
      setFase("trabajo");
      setSegundosRestantes(getTotalSeconds("trabajo"));
      sendNotification("Descanso terminado", "Vamos con otra sesión de trabajo.");
    }
  }, [fase, sesionActual, config.sesionesAntes, getTotalSeconds]);

  // ─── Timer interval ─────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;

    if (running) {
      intervalRef.current = setInterval(() => {
        setSegundosRestantes((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, hydrated]);

  // ─── Detect timer reaching 0 ────────────────────────────
  useEffect(() => {
    if (segundosRestantes === 0 && running) {
      setRunning(false);
      handlePhaseComplete();
    }
  }, [segundosRestantes, running, handlePhaseComplete]);

  // ─── Persist state to localStorage ──────────────────────
  useEffect(() => {
    if (!hydrated) return;
    saveState({ running, segundosRestantes, fase, sesionActual, timestamp: Date.now() });
  }, [running, segundosRestantes, fase, sesionActual, hydrated]);

  // ─── Tab title ──────────────────────────────────────────
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!originalTitleRef.current) originalTitleRef.current = document.title;

    if (running) {
      const m = Math.floor(segundosRestantes / 60).toString().padStart(2, "0");
      const s = (segundosRestantes % 60).toString().padStart(2, "0");
      document.title = `[${m}:${s}] ${FASE_LABELS[fase]} — Studio Iuris`;
    } else {
      document.title = originalTitleRef.current || "Studio Iuris";
    }

    return () => {
      if (originalTitleRef.current) document.title = originalTitleRef.current;
    };
  }, [running, segundosRestantes, fase]);

  // ─── Actions ────────────────────────────────────────────
  const iniciar = useCallback(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setRunning(true);
  }, []);

  const pausar = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    setSegundosRestantes(getTotalSeconds(fase));
  }, [fase, getTotalSeconds]);

  const updateConfig = useCallback(
    (c: PomodoroConfig) => {
      setConfig(c);
      saveConfig(c);
      if (!running) {
        setSegundosRestantes(c[fase === "trabajo" ? "trabajo" : fase === "descanso_corto" ? "descCorto" : "descLargo"] * 60);
      }
    },
    [running, fase]
  );

  return (
    <PomodoroContext.Provider
      value={{
        config,
        running,
        segundosRestantes,
        fase,
        sesionActual,
        showSettings,
        iniciar,
        pausar,
        reset,
        setShowSettings,
        updateConfig,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}
