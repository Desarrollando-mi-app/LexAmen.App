"use client";

import { useEffect, useState } from "react";
import { getGradoInfo, NIVELES, type NivelLiga } from "@/lib/league";
import { GradeUpModal } from "./grade-up-modal";
import { playLevelDown } from "@/lib/sounds";
import { toast } from "sonner";

const STORAGE_KEY = "studio-iuris-last-grado";

interface GradoChangeDetectorProps {
  userGrado: number;
}

const NIVEL_COLORS: Record<string, string> = {
  ESCUELA: "#3a5a35",
  PRACTICA: "#9a7230",
  ESTRADO: "#6b1d2a",
  MAGISTRATURA: "#12203a",
  CONSEJO: "#c49a50",
};

export function GradoChangeDetector({ userGrado }: GradoChangeDetectorProps) {
  const [showGradeUp, setShowGradeUp] = useState(false);
  const [prevGrado, setPrevGrado] = useState(userGrado);

  useEffect(() => {
    const storedStr = localStorage.getItem(STORAGE_KEY);
    const storedGrado = storedStr ? parseInt(storedStr, 10) : null;

    if (storedGrado !== null && !isNaN(storedGrado)) {
      if (userGrado > storedGrado) {
        setPrevGrado(storedGrado);
        setShowGradeUp(true);
      } else if (userGrado < storedGrado) {
        const info = getGradoInfo(userGrado);
        playLevelDown();
        toast.info(`Descendiste al Grado ${info.grado} · ${info.nombre}`);
      }
    }

    localStorage.setItem(STORAGE_KEY, String(userGrado));
  }, [userGrado]);

  if (!showGradeUp) return null;

  const gradoInfo = getGradoInfo(userGrado);
  const nivelInfo = NIVELES[gradoInfo.nivel as NivelLiga];

  return (
    <GradeUpModal
      visible={showGradeUp}
      gradoAnterior={prevGrado}
      gradoNuevo={userGrado}
      nombreGrado={gradoInfo.nombre}
      nivelNombre={nivelInfo ? `Nivel ${nivelInfo.label}` : ""}
      emoji={gradoInfo.emoji}
      color={NIVEL_COLORS[gradoInfo.nivel] ?? "#12203a"}
      onClose={() => setShowGradeUp(false)}
    />
  );
}
