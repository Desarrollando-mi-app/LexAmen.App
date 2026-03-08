"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_WORK = 25;
const DEFAULT_SHORT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;
const POMODOROS_BEFORE_LONG = 4;

type PomodoroMode = "work" | "shortBreak" | "longBreak";

interface PomodoroSettings {
  work: number;
  shortBreak: number;
  longBreak: number;
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  work: "Trabajo",
  shortBreak: "Descanso corto",
  longBreak: "Descanso largo",
};

const MODE_COLORS: Record<PomodoroMode, string> = {
  work: "var(--accent)",
  shortBreak: "#1A5C3A",
  longBreak: "#1e4080",
};

// ─── Audio helper ───────────────────────────────────────────

function playTone(frequency: number, duration: number) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

// ─── localStorage helpers ───────────────────────────────────

function loadSettings(): PomodoroSettings {
  if (typeof window === "undefined") {
    return { work: DEFAULT_WORK, shortBreak: DEFAULT_SHORT_BREAK, longBreak: DEFAULT_LONG_BREAK };
  }
  try {
    const saved = localStorage.getItem("pomodoro-settings");
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return { work: DEFAULT_WORK, shortBreak: DEFAULT_SHORT_BREAK, longBreak: DEFAULT_LONG_BREAK };
}

function saveSettings(s: PomodoroSettings) {
  try {
    localStorage.setItem("pomodoro-settings", JSON.stringify(s));
  } catch {
    // ignore
  }
}

// ─── Component ──────────────────────────────────────────────

interface PomodoroTimerProps {
  variant?: "sidebar" | "card";
}

export function PomodoroTimer({ variant = "card" }: PomodoroTimerProps) {
  const [settings, setSettings] = useState<PomodoroSettings>(() => loadSettings());
  const [mode, setMode] = useState<PomodoroMode>("work");
  const [timeLeft, setTimeLeft] = useState(settings.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [sessionLabel, setSessionLabel] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(variant === "card");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef("");

  // ─── Total time for current mode ───────────────────────────

  const getTotalTime = useCallback(
    (m: PomodoroMode) => {
      switch (m) {
        case "work":
          return settings.work * 60;
        case "shortBreak":
          return settings.shortBreak * 60;
        case "longBreak":
          return settings.longBreak * 60;
      }
    },
    [settings]
  );

  // ─── Request notification permission ───────────────────────

  const requestNotificationPermission = useCallback(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // ─── Cycle completion ──────────────────────────────────────

  const handleCycleComplete = useCallback(() => {
    if (mode === "work") {
      // Work finished
      playTone(880, 0.5);
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);

      const nextMode: PomodoroMode =
        newCount % POMODOROS_BEFORE_LONG === 0 ? "longBreak" : "shortBreak";
      setMode(nextMode);
      setTimeLeft(getTotalTime(nextMode));

      // Notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Pomodoro completado", {
          body: `Sesión ${newCount} terminada. Tiempo de ${nextMode === "longBreak" ? "descanso largo" : "descanso corto"}.`,
        });
      }
    } else {
      // Break finished
      playTone(440, 0.5);
      setMode("work");
      setTimeLeft(getTotalTime("work"));

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Descanso terminado", {
          body: "Vamos con otra sesión de trabajo.",
        });
      }
    }
  }, [mode, pomodoroCount, getTotalTime]);

  // ─── Timer interval ───────────────────────────────────────

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
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
  }, [isRunning]);

  // ─── Detect when timeLeft hits 0 ──────────────────────────

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleCycleComplete();
    }
  }, [timeLeft, isRunning, handleCycleComplete]);

  // ─── Tab title ─────────────────────────────────────────────

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }

    if (isRunning) {
      const mins = Math.floor(timeLeft / 60)
        .toString()
        .padStart(2, "0");
      const secs = (timeLeft % 60).toString().padStart(2, "0");
      document.title = `[${mins}:${secs}] ${MODE_LABELS[mode]} — Iuris Studio`;
    } else {
      document.title = originalTitleRef.current || "Iuris Studio";
    }

    return () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [isRunning, timeLeft, mode]);

  // ─── Actions ───────────────────────────────────────────────

  function handleStartPause() {
    if (!isRunning) {
      requestNotificationPermission();
    }
    setIsRunning(!isRunning);
  }

  function handleReset() {
    setIsRunning(false);
    setTimeLeft(getTotalTime(mode));
  }

  function handleSettingsSave(newSettings: PomodoroSettings) {
    setSettings(newSettings);
    saveSettings(newSettings);
    setShowSettings(false);

    // Reset timer if not running
    if (!isRunning) {
      setTimeLeft(newSettings[mode] * 60);
    }
  }

  // ─── Format time ──────────────────────────────────────────

  const mins = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");

  // ─── SVG progress ─────────────────────────────────────────

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const totalTime = getTotalTime(mode);
  const progress = totalTime > 0 ? timeLeft / totalTime : 1;
  const strokeDashoffset = circumference * (1 - progress);

  // ─── Card variant (collapsible) ────────────────────────────

  if (variant === "card" && collapsed) {
    return (
      <div className="rounded-xl border border-border bg-white p-5">
        <button
          onClick={() => setCollapsed(false)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🍅</span>
            <div className="text-left">
              <p className="font-semibold text-navy font-display">Pomodoro</p>
              {pomodoroCount > 0 && (
                <p className="text-xs text-navy/50">
                  {pomodoroCount} sesion{pomodoroCount !== 1 ? "es" : ""} completada{pomodoroCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <svg className="h-5 w-5 text-navy/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  const wrapperClass =
    variant === "card"
      ? "rounded-xl border border-border bg-white p-5"
      : "";

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍅</span>
          <p className="font-semibold text-navy font-display">Pomodoro</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg p-1.5 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors"
            title="Configuración"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {variant === "card" && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors"
              title="Colapsar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSettingsSave}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {/* Timer display */}
      {!showSettings && (
        <>
          {/* SVG Circle */}
          <div className="flex justify-center">
            <div className="relative">
              <svg
                width={radius * 2 + 20}
                height={radius * 2 + 20}
                className="transform -rotate-90"
              >
                {/* Background circle */}
                <circle
                  cx={radius + 10}
                  cy={radius + 10}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={6}
                  className="text-navy/10"
                />
                {/* Progress circle */}
                <circle
                  cx={radius + 10}
                  cy={radius + 10}
                  r={radius}
                  fill="none"
                  stroke={MODE_COLORS[mode]}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              {/* Time text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-3xl font-bold font-display"
                  style={{ color: MODE_COLORS[mode] }}
                >
                  {mins}:{secs}
                </span>
                <span className="mt-1 text-xs font-medium text-navy/50">
                  {MODE_LABELS[mode]}
                </span>
              </div>
            </div>
          </div>

          {/* Session label */}
          <div className="mt-4">
            <input
              type="text"
              value={sessionLabel}
              onChange={(e) => setSessionLabel(e.target.value)}
              placeholder="Etiquetar sesión..."
              className="w-full rounded-lg border border-border px-3 py-1.5 text-xs text-navy placeholder:text-navy/30 focus:border-gold focus:outline-none bg-transparent"
            />
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy/60 hover:bg-navy/5 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleStartPause}
              className="rounded-lg px-6 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: MODE_COLORS[mode] }}
            >
              {isRunning ? "Pausar" : "Iniciar"}
            </button>
          </div>

          {/* Pomodoro count */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {Array.from({ length: POMODOROS_BEFORE_LONG }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < pomodoroCount % POMODOROS_BEFORE_LONG || (pomodoroCount > 0 && pomodoroCount % POMODOROS_BEFORE_LONG === 0 && i < POMODOROS_BEFORE_LONG)
                    ? ""
                    : "bg-navy/15"
                }`}
                style={
                  i < pomodoroCount % POMODOROS_BEFORE_LONG || (pomodoroCount > 0 && pomodoroCount % POMODOROS_BEFORE_LONG === 0)
                    ? { backgroundColor: MODE_COLORS.work }
                    : undefined
                }
              />
            ))}
            {pomodoroCount > 0 && (
              <span className="ml-2 text-xs text-navy/40">
                {pomodoroCount} sesion{pomodoroCount !== 1 ? "es" : ""}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Settings subcomponent ──────────────────────────────────

function SettingsPanel({
  settings,
  onSave,
  onCancel,
}: {
  settings: PomodoroSettings;
  onSave: (s: PomodoroSettings) => void;
  onCancel: () => void;
}) {
  const [work, setWork] = useState(settings.work);
  const [shortBreak, setShortBreak] = useState(settings.shortBreak);
  const [longBreak, setLongBreak] = useState(settings.longBreak);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-navy/60 mb-1">
          Trabajo (min)
        </label>
        <input
          type="number"
          min={1}
          max={120}
          value={work}
          onChange={(e) => setWork(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-navy/60 mb-1">
          Descanso corto (min)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={shortBreak}
          onChange={(e) =>
            setShortBreak(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-navy/60 mb-1">
          Descanso largo (min)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={longBreak}
          onChange={(e) =>
            setLongBreak(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-navy/60 hover:bg-navy/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave({ work, shortBreak, longBreak })}
          className="flex-1 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white hover:bg-gold/90 transition-colors"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
