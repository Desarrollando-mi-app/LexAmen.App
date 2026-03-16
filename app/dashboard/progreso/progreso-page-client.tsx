"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MiExamenSetup } from "./components/mi-examen-setup";
import { ProgresoDashboard } from "./components/progreso-dashboard";

// ─── Types ─────────────────────────────────────────────────

interface ExamenTema {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoriaOriginal: string | null;
  materiaMapping: string | null;
  libroMapping: string | null;
  tituloMapping: string | null;
  tieneContenido: boolean;
  flashcardsDisponibles: number;
  mcqDisponibles: number;
  vfDisponibles: number;
  flashcardsDominadas: number;
  mcqCorrectas: number;
  vfCorrectas: number;
  porcentajeAvance: number;
  peso: number;
  orden: number;
}

interface SerializedConfig {
  id: string;
  universidad: string;
  sede: string | null;
  fechaExamen: string | null;
  parseStatus: string;
  parseError: string | null;
  parsedAt: string | null;
  temas: ExamenTema[];
}

interface ProgresoPageClientProps {
  config: SerializedConfig | null;
  initialUniversidad: string | null;
  initialSede: string | null;
  initialFechaExamen: string | null;
}

// ─── Component ─────────────────────────────────────────────

export function ProgresoPageClient({
  config,
  initialUniversidad,
  initialSede,
  initialFechaExamen,
}: ProgresoPageClientProps) {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(false);

  // Show setup if:
  // 1. No config at all
  // 2. Parsing not completed yet
  // 3. User chose to reconfigure
  const shouldShowSetup =
    showSetup ||
    !config ||
    config.parseStatus === "pending" ||
    config.parseStatus === "error";

  // Config exists but still parsing
  const isParsing = config?.parseStatus === "parsing";

  if (shouldShowSetup && !isParsing) {
    return (
      <MiExamenSetup
        initialUniversidad={config?.universidad ?? initialUniversidad}
        initialSede={config?.sede ?? initialSede}
        initialFechaExamen={config?.fechaExamen ?? initialFechaExamen}
      />
    );
  }

  // Parsing in progress — show waiting state
  if (isParsing) {
    return (
      <div className="mx-auto max-w-2xl px-4 lg:px-0 py-16 text-center">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
          Mi Examen &middot; Procesando
        </p>
        <div className="flex items-center justify-center gap-3 mb-1">
          <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={100} height={100} className="h-[80px] w-[80px] lg:h-[100px] lg:w-[100px]" />
          <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-tight">
            Analizando tu cedulario
          </h1>
        </div>
        <div className="border-b-2 border-gz-rule-dark mt-4 mb-8 mx-auto max-w-xs" />
        <div className="inline-block animate-spin w-8 h-8 border-2 border-gz-gold border-t-transparent rounded-full mb-4" />
        <p className="font-cormorant italic text-[17px] text-gz-ink-mid">
          Esto puede tomar unos segundos...
        </p>
        <button
          onClick={() => router.refresh()}
          className="mt-6 font-archivo text-[12px] text-gz-gold hover:underline"
        >
          Actualizar estado
        </button>
      </div>
    );
  }

  // Config with completed parsing — show dashboard
  if (config && config.parseStatus === "completed" && config.temas.length > 0) {
    return (
      <ProgresoDashboard
        configId={config.id}
        universidad={config.universidad}
        sede={config.sede}
        fechaExamen={config.fechaExamen}
        initialTemas={config.temas}
        onReconfigure={() => setShowSetup(true)}
      />
    );
  }

  // Fallback — show setup
  return (
    <MiExamenSetup
      initialUniversidad={config?.universidad ?? initialUniversidad}
      initialSede={config?.sede ?? initialSede}
      initialFechaExamen={config?.fechaExamen ?? initialFechaExamen}
    />
  );
}
