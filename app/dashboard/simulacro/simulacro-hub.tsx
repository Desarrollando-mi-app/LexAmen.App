"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { INTERROGADORES, type InterrogadorData } from "@/lib/interrogadores";
import { CURRICULUM } from "@/lib/curriculum-data";

// ─── Types ──────────────────────────────────────────────

interface SesionReciente {
  id: string;
  interrogadorId: string;
  fuente: string;
  rama: string | null;
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  nivelActual: string;
  completada: boolean;
  createdAt: string;
}

interface PreguntaActiva {
  preguntaId: string;
  preguntaTexto: string;
  audioUrl: string | null;
  numero: number;
  nivel: string;
  totalPreguntas: number;
}

interface RespuestaEval {
  correcta: boolean;
  feedback: string;
  feedbackAudioUrl: string | null;
  conceptoClave: string;
  nivelNuevo: string;
  sesionCompletada: boolean;
  stats: { correctas: number; incorrectas: number; nivelActual: string };
}

interface PreguntaHistorial {
  preguntaTexto: string;
  respuestaUser: string | null;
  evaluacion: string | null;
  correcta: boolean | null;
  nivel: string;
}

type Pantalla = "config" | "activa" | "resultados";

interface Props {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  sesionesRecientes: SesionReciente[];
}

// ─── Avatar Placeholder ─────────────────────────────────

function AvatarInterrogador({
  interrogador,
  size = "lg",
  animando = false,
  resultColor,
}: {
  interrogador: InterrogadorData;
  size?: "sm" | "md" | "lg" | "xl";
  animando?: boolean;
  resultColor?: "green" | "red" | null;
}) {
  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-16 h-16 text-xl",
    lg: "w-24 h-24 text-3xl",
    xl: "w-32 h-32 text-4xl",
  };

  const borderColor = resultColor === "green"
    ? "ring-green-500"
    : resultColor === "red"
    ? "ring-red-500"
    : animando
    ? "ring-gold animate-pulse"
    : "ring-gray-300";

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ring-4 ${borderColor} flex items-center justify-center font-bold text-white transition-all duration-300`}
      style={{ backgroundColor: interrogador.color }}
    >
      {interrogador.iniciales}
    </div>
  );
}

// ─── Nivel Badge ────────────────────────────────────────

function NivelBadge({ nivel }: { nivel: string }) {
  const colors: Record<string, string> = {
    BASICO: "bg-emerald-100 text-emerald-800",
    INTERMEDIO: "bg-amber-100 text-amber-800",
    AVANZADO: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    BASICO: "Básico",
    INTERMEDIO: "Intermedio",
    AVANZADO: "Avanzado",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[nivel] || "bg-gray-100 text-gray-700"}`}>
      {labels[nivel] || nivel}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────

export function SimulacroHub({ userName, avatarUrl, sesionesRecientes }: Props) {
  const [pantalla, setPantalla] = useState<Pantalla>("config");

  // ── Config state
  const [interrogadorSeleccionado, setInterrogadorSeleccionado] = useState<string | null>(null);
  const [fuente, setFuente] = useState<"INDICE_MAESTRO" | "APUNTES_PROPIOS" | null>(null);
  const [rama, setRama] = useState("");
  const [libro, setLibro] = useState("");
  const [titulo, setTitulo] = useState("");
  const [totalPreguntas, setTotalPreguntas] = useState(10);
  const [apuntesTexto, setApuntesTexto] = useState("");
  const [apuntesNombre, setApuntesNombre] = useState("");
  const [uploadingApuntes, setUploadingApuntes] = useState(false);
  const [creandoSesion, setCreandoSesion] = useState(false);

  // ── Active session state
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [interrogadorActivo, setInterrogadorActivo] = useState<InterrogadorData | null>(null);
  const [preguntaActiva, setPreguntaActiva] = useState<PreguntaActiva | null>(null);
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [cargandoPregunta, setCargandoPregunta] = useState(false);
  const [evaluacion, setEvaluacion] = useState<RespuestaEval | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [statsActivas, setStatsActivas] = useState({ correctas: 0, incorrectas: 0 });

  // ── Results state
  const [resultados, setResultados] = useState<{
    correctas: number;
    incorrectas: number;
    total: number;
    nivelFinal: string;
    preguntas: PreguntaHistorial[];
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Audio helper
  const reproducirAudio = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setAudioPlaying(true);
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);
    audio.play().catch(() => setAudioPlaying(false));
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // ── Curriculum helpers
  const ramaKeys = Object.keys(CURRICULUM);
  const seccionesDisponibles = rama ? CURRICULUM[rama]?.secciones || [] : [];
  const titulosDisponibles = libro
    ? seccionesDisponibles.find((s) => s.libro === libro)?.titulos || []
    : [];

  // ── Upload apuntes
  const handleUploadApuntes = async (file: File) => {
    setUploadingApuntes(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/simulacro/upload-apuntes", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApuntesTexto(data.texto);
      setApuntesNombre(data.nombre);
      toast.success(`${data.nombre} — ${data.caracteres.toLocaleString()} caracteres extraídos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar archivo");
    } finally {
      setUploadingApuntes(false);
    }
  };

  // ── Iniciar sesión
  const iniciarSesion = async () => {
    if (!interrogadorSeleccionado || !fuente) return;
    setCreandoSesion(true);
    try {
      const body: Record<string, unknown> = {
        interrogadorId: interrogadorSeleccionado,
        fuente,
        totalPreguntas,
      };
      if (fuente === "INDICE_MAESTRO") {
        body.rama = rama || "DERECHO_CIVIL";
        if (libro) body.libro = libro;
        if (titulo) body.titulo = titulo;
      } else {
        body.apuntesTexto = apuntesTexto;
        body.apuntesNombre = apuntesNombre;
      }

      const res = await fetch("/api/simulacro/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSesionId(data.sesionId);
      setInterrogadorActivo(INTERROGADORES[interrogadorSeleccionado]);
      setStatsActivas({ correctas: 0, incorrectas: 0 });
      setPantalla("activa");

      // Pedir primera pregunta
      await pedirPregunta(data.sesionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear sesión");
    } finally {
      setCreandoSesion(false);
    }
  };

  // ── Pedir pregunta
  const pedirPregunta = async (sid?: string) => {
    const id = sid || sesionId;
    if (!id) return;
    setCargandoPregunta(true);
    setEvaluacion(null);
    setRespuestaTexto("");
    try {
      const res = await fetch("/api/simulacro/pregunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesionId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreguntaActiva(data);

      // Reproducir audio automáticamente
      if (data.audioUrl) {
        setTimeout(() => reproducirAudio(data.audioUrl), 500);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al obtener pregunta");
    } finally {
      setCargandoPregunta(false);
    }
  };

  // ── Enviar respuesta
  const enviarRespuesta = async () => {
    if (!preguntaActiva || !respuestaTexto.trim()) return;
    setEnviandoRespuesta(true);
    try {
      const res = await fetch("/api/simulacro/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preguntaId: preguntaActiva.preguntaId,
          respuesta: respuestaTexto,
        }),
      });
      const data: RespuestaEval = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error);
      setEvaluacion(data);
      setStatsActivas(data.stats);

      // Reproducir audio del feedback
      if (data.feedbackAudioUrl) {
        setTimeout(() => reproducirAudio(data.feedbackAudioUrl!), 300);
      }

      // Si la sesión terminó, cargar resultados
      if (data.sesionCompletada) {
        await cargarResultados();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al evaluar respuesta");
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  // ── Cargar resultados
  const cargarResultados = async () => {
    if (!sesionId) return;
    try {
      const res = await fetch(`/api/simulacro/sesion/${sesionId}`);
      const data = await res.json();
      if (!res.ok) return;
      setResultados({
        correctas: data.correctas,
        incorrectas: data.incorrectas,
        total: data.totalPreguntas,
        nivelFinal: data.nivelActual,
        preguntas: data.preguntas.map((p: PreguntaHistorial) => ({
          preguntaTexto: p.preguntaTexto,
          respuestaUser: p.respuestaUser,
          evaluacion: p.evaluacion,
          correcta: p.correcta,
          nivel: p.nivel,
        })),
      });
    } catch {
      // Ignore
    }
  };

  // ── Reset
  const nuevaSesion = (mismoInterrogador = false) => {
    setPantalla("config");
    setSesionId(null);
    setPreguntaActiva(null);
    setEvaluacion(null);
    setResultados(null);
    setRespuestaTexto("");
    setStatsActivas({ correctas: 0, incorrectas: 0 });
    if (!mismoInterrogador) {
      setInterrogadorSeleccionado(null);
    }
  };

  // ─── PANTALLA 1: CONFIGURACIÓN ────────────────────────

  if (pantalla === "config") {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-24">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-navy font-display">
            🎙️ Simulacro de Interrogación
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            Practica con un interrogador IA antes de tu examen de grado
          </p>
        </div>

        {/* Paso A: Elegir interrogador */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy">
            1. Elige tu interrogador
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.values(INTERROGADORES).map((int) => {
              const selected = interrogadorSeleccionado === int.id;
              return (
                <button
                  key={int.id}
                  onClick={() => setInterrogadorSeleccionado(int.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                    selected
                      ? "border-gold bg-gold/5 shadow-md"
                      : "border-border bg-white hover:border-gold/40"
                  }`}
                >
                  <AvatarInterrogador interrogador={int} size="md" />
                  <span className="text-sm font-semibold text-navy">
                    {int.nombre}
                  </span>
                  <span className="text-[11px] text-navy/60 leading-tight">
                    {int.descripcion}
                  </span>
                  <span className="text-[10px] text-navy/40 italic leading-tight">
                    {int.detalle}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Paso B: Elegir fuente */}
        {interrogadorSeleccionado && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">
              2. Elige la fuente de preguntas
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Índice Maestro */}
              <button
                onClick={() => {
                  setFuente("INDICE_MAESTRO");
                  setApuntesTexto("");
                  setApuntesNombre("");
                }}
                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition-all ${
                  fuente === "INDICE_MAESTRO"
                    ? "border-gold bg-gold/5"
                    : "border-border bg-white hover:border-gold/40"
                }`}
              >
                <span className="text-3xl">📚</span>
                <span className="font-semibold text-navy">Índice Maestro</span>
                <span className="text-sm text-navy/60">
                  Preguntas desde el Código Civil y Procesal Civil
                </span>
              </button>

              {/* Mis Apuntes */}
              <button
                onClick={() => {
                  setFuente("APUNTES_PROPIOS");
                  setRama("");
                  setLibro("");
                  setTitulo("");
                }}
                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition-all ${
                  fuente === "APUNTES_PROPIOS"
                    ? "border-gold bg-gold/5"
                    : "border-border bg-white hover:border-gold/40"
                }`}
              >
                <span className="text-3xl">📄</span>
                <span className="font-semibold text-navy">Mis Apuntes</span>
                <span className="text-sm text-navy/60">
                  Sube tus propios apuntes (PDF o DOCX)
                </span>
              </button>
            </div>

            {/* Selectores del Índice Maestro */}
            {fuente === "INDICE_MAESTRO" && (
              <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-border bg-paper p-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy/60">
                    Rama
                  </label>
                  <select
                    value={rama}
                    onChange={(e) => {
                      setRama(e.target.value);
                      setLibro("");
                      setTitulo("");
                    }}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy"
                  >
                    <option value="">Todas</option>
                    {ramaKeys.map((key) => (
                      <option key={key} value={key}>
                        {CURRICULUM[key].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy/60">
                    Libro
                  </label>
                  <select
                    value={libro}
                    onChange={(e) => {
                      setLibro(e.target.value);
                      setTitulo("");
                    }}
                    disabled={!rama}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy disabled:opacity-50"
                  >
                    <option value="">Todos</option>
                    {seccionesDisponibles.map((s) => (
                      <option key={s.id} value={s.libro}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy/60">
                    Título
                  </label>
                  <select
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    disabled={!libro}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy disabled:opacity-50"
                  >
                    <option value="">Todos</option>
                    {titulosDisponibles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Upload de apuntes */}
            {fuente === "APUNTES_PROPIOS" && (
              <div className="rounded-xl border border-border bg-paper p-4 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadApuntes(f);
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files[0];
                    if (f) handleUploadApuntes(f);
                  }}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gold/40 p-8 text-center hover:border-gold hover:bg-gold/5 transition-colors"
                >
                  {uploadingApuntes ? (
                    <div className="animate-spin text-2xl">⏳</div>
                  ) : (
                    <>
                      <span className="text-3xl">📤</span>
                      <span className="text-sm font-medium text-navy">
                        Arrastra tu archivo aquí o haz clic
                      </span>
                      <span className="text-xs text-navy/50">
                        PDF o DOCX — máx 10MB
                      </span>
                    </>
                  )}
                </div>
                {apuntesNombre && (
                  <div className="rounded-lg bg-white p-3 border border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📎</span>
                      <span className="text-sm font-medium text-navy">
                        {apuntesNombre}
                      </span>
                      <span className="text-xs text-navy/50">
                        ({apuntesTexto.length.toLocaleString()} chars)
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-navy/60 line-clamp-3">
                      {apuntesTexto.slice(0, 200)}...
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Paso C: Duración */}
        {interrogadorSeleccionado && fuente && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">
              3. Número de preguntas
            </h2>
            <div className="flex gap-3">
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalPreguntas(n)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    totalPreguntas === n
                      ? "bg-gold text-white shadow"
                      : "bg-white border border-border text-navy hover:border-gold/40"
                  }`}
                >
                  {n} preguntas
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Botón iniciar */}
        {interrogadorSeleccionado &&
          fuente &&
          (fuente === "INDICE_MAESTRO" || apuntesTexto) && (
            <button
              onClick={iniciarSesion}
              disabled={creandoSesion}
              className="w-full rounded-xl bg-navy py-4 text-lg font-bold text-white shadow-lg hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {creandoSesion ? "Preparando sesión..." : "🎙️ Iniciar Simulacro"}
            </button>
          )}

        {/* Sesiones recientes */}
        {sesionesRecientes.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">
              Sesiones recientes
            </h2>
            <div className="space-y-2">
              {sesionesRecientes.map((s) => {
                const int = INTERROGADORES[s.interrogadorId];
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-white p-3"
                  >
                    {int && <AvatarInterrogador interrogador={int} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-navy">
                        {int?.nombre || s.interrogadorId}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-navy/50">
                        <span>
                          ✅ {s.correctas}/{s.totalPreguntas}
                        </span>
                        <NivelBadge nivel={s.nivelActual} />
                        {!s.completada && (
                          <span className="text-amber-600">En curso</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-navy/40">
                      {new Date(s.createdAt).toLocaleDateString("es-CL")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ─── PANTALLA 2: SIMULACRO ACTIVO ─────────────────────

  if (pantalla === "activa" && interrogadorActivo) {
    const progreso = preguntaActiva
      ? (preguntaActiva.numero / preguntaActiva.totalPreguntas) * 100
      : 0;

    return (
      <div className="mx-auto max-w-6xl pb-24">
        {/* Barra superior */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarInterrogador interrogador={interrogadorActivo} size="sm" />
            <div>
              <h2 className="text-lg font-bold text-navy">
                {interrogadorActivo.nombre}
              </h2>
              {preguntaActiva && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-navy/60">
                    Pregunta {preguntaActiva.numero}/{preguntaActiva.totalPreguntas}
                  </span>
                  <NivelBadge nivel={preguntaActiva.nivel} />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => nuevaSesion()}
            className="text-sm text-navy/50 hover:text-red-600 transition-colors"
          >
            ✕ Salir
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="mb-6 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500"
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className="flex gap-6">
          {/* Área principal */}
          <div className="flex-1 space-y-4">
            {cargandoPregunta ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <AvatarInterrogador
                    interrogador={interrogadorActivo}
                    size="xl"
                    animando
                  />
                </div>
                <p className="text-navy/60 animate-pulse">
                  Formulando pregunta...
                </p>
              </div>
            ) : preguntaActiva ? (
              <div className="space-y-4">
                {/* Avatar + pregunta */}
                <div className="flex flex-col items-center space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <AvatarInterrogador
                    interrogador={interrogadorActivo}
                    size="xl"
                    animando={audioPlaying && !evaluacion}
                    resultColor={
                      evaluacion
                        ? evaluacion.correcta
                          ? "green"
                          : "red"
                        : null
                    }
                  />

                  {/* Texto de la pregunta */}
                  <p className="text-center text-lg font-medium text-navy leading-relaxed max-w-2xl">
                    {preguntaActiva.preguntaTexto}
                  </p>

                  {/* Botón reproducir audio */}
                  {preguntaActiva.audioUrl && (
                    <button
                      onClick={() => reproducirAudio(preguntaActiva.audioUrl!)}
                      className="flex items-center gap-1.5 rounded-full bg-navy/10 px-4 py-1.5 text-sm text-navy hover:bg-navy/20 transition-colors"
                    >
                      {audioPlaying ? "🔊 Reproduciendo..." : "🔊 Escuchar"}
                    </button>
                  )}

                  {/* Feedback del interrogador */}
                  {evaluacion && (
                    <div
                      className={`w-full rounded-xl p-4 ${
                        evaluacion.correcta
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">
                          {evaluacion.correcta ? "✅" : "❌"}
                        </span>
                        <div>
                          <p className="text-sm text-navy leading-relaxed">
                            {evaluacion.feedback}
                          </p>
                          <p className="mt-1 text-xs text-navy/50">
                            Concepto: {evaluacion.conceptoClave}
                          </p>
                        </div>
                      </div>
                      {evaluacion.feedbackAudioUrl && (
                        <button
                          onClick={() =>
                            reproducirAudio(evaluacion.feedbackAudioUrl!)
                          }
                          className="mt-2 text-xs text-navy/60 hover:text-navy transition-colors"
                        >
                          🔊 Escuchar feedback
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Textarea + botón responder */}
                {!evaluacion ? (
                  <div className="space-y-3">
                    <textarea
                      value={respuestaTexto}
                      onChange={(e) => setRespuestaTexto(e.target.value)}
                      placeholder={interrogadorActivo.placeholder}
                      rows={4}
                      disabled={enviandoRespuesta}
                      className="w-full rounded-xl border border-border bg-white p-4 text-navy placeholder:text-navy/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50 resize-none"
                    />
                    <button
                      onClick={enviarRespuesta}
                      disabled={
                        enviandoRespuesta || !respuestaTexto.trim()
                      }
                      className="w-full rounded-xl bg-gold py-3 text-base font-bold text-white shadow hover:bg-gold/90 transition-colors disabled:opacity-50"
                    >
                      {enviandoRespuesta ? "Evaluando..." : "Responder"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (evaluacion.sesionCompletada) {
                        setPantalla("resultados");
                      } else {
                        pedirPregunta();
                      }
                    }}
                    className="w-full rounded-xl bg-navy py-3 text-base font-bold text-white shadow hover:bg-navy/90 transition-colors"
                  >
                    {evaluacion.sesionCompletada
                      ? "📊 Ver resultados"
                      : "Siguiente pregunta →"}
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:flex w-56 flex-col gap-4">
            {/* Mini avatar usuario */}
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy/10 text-xl font-bold text-navy">
                  {userName.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-navy">{userName}</span>
            </div>

            {/* Stats */}
            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
                Progreso
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy/70">✅ Correctas</span>
                <span className="text-lg font-bold text-green-600">
                  {statsActivas.correctas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy/70">❌ Incorrectas</span>
                <span className="text-lg font-bold text-red-500">
                  {statsActivas.incorrectas}
                </span>
              </div>
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-navy/50">Nivel actual</span>
                <div className="mt-1">
                  <NivelBadge
                    nivel={
                      preguntaActiva?.nivel ||
                      evaluacion?.nivelNuevo ||
                      "BASICO"
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile stats bar */}
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-border bg-white px-4 py-2 lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <span className="text-sm">
              ✅ {statsActivas.correctas} | ❌ {statsActivas.incorrectas}
            </span>
            <NivelBadge
              nivel={
                preguntaActiva?.nivel || evaluacion?.nivelNuevo || "BASICO"
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── PANTALLA 3: RESULTADOS ───────────────────────────

  if (pantalla === "resultados" && interrogadorActivo) {
    const r = resultados;
    const porcentaje = r ? Math.round((r.correctas / r.total) * 100) : 0;
    const xpGanado = r
      ? 5 + r.correctas * 2 + (r.nivelFinal === "AVANZADO" ? 5 : 0)
      : 0;

    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-24">
        {/* Header resultado */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <AvatarInterrogador interrogador={interrogadorActivo} size="lg" />
          <h2 className="text-xl font-bold text-navy">Sesión completada</h2>

          {r && (
            <>
              {/* Score */}
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-navy">
                  {r.correctas}
                </span>
                <span className="text-2xl text-navy/40">/ {r.total}</span>
              </div>
              <div className="text-lg text-navy/60">{porcentaje}% correcto</div>

              {/* Nivel + XP */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-xs text-navy/50">Nivel final</span>
                  <div className="mt-1">
                    <NivelBadge nivel={r.nivelFinal} />
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xs text-navy/50">XP ganado</span>
                  <div className="mt-1 text-lg font-bold text-gold">
                    +{xpGanado}
                  </div>
                </div>
              </div>

              {/* Gráfico de barras */}
              <div className="flex w-full items-center gap-1 mt-4 max-w-md">
                {r.preguntas.map((p, i) => (
                  <div
                    key={i}
                    className={`h-8 flex-1 rounded-sm transition-colors ${
                      p.correcta ? "bg-green-400" : "bg-red-400"
                    }`}
                    title={`P${i + 1}: ${p.correcta ? "Correcta" : "Incorrecta"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-navy/40">
                Verde = correcta · Rojo = incorrecta
              </p>
            </>
          )}
        </div>

        {/* Detalle por pregunta */}
        {r && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-navy">
              Detalle por pregunta
            </h3>
            {r.preguntas.map((p, i) => (
              <details
                key={i}
                className="group rounded-xl border border-border bg-white overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center gap-3 p-4 hover:bg-paper transition-colors">
                  <span className="text-lg">
                    {p.correcta ? "✅" : "❌"}
                  </span>
                  <span className="flex-1 text-sm font-medium text-navy line-clamp-1">
                    P{i + 1}. {p.preguntaTexto}
                  </span>
                  <NivelBadge nivel={p.nivel} />
                  <span className="text-navy/30 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="border-t border-border p-4 space-y-3 bg-paper/50">
                  <div>
                    <span className="text-xs font-semibold text-navy/50 uppercase">
                      Pregunta
                    </span>
                    <p className="mt-1 text-sm text-navy">
                      {p.preguntaTexto}
                    </p>
                  </div>
                  {p.respuestaUser && (
                    <div>
                      <span className="text-xs font-semibold text-navy/50 uppercase">
                        Tu respuesta
                      </span>
                      <p className="mt-1 text-sm text-navy/80">
                        {p.respuestaUser}
                      </p>
                    </div>
                  )}
                  {p.evaluacion && (
                    <div>
                      <span className="text-xs font-semibold text-navy/50 uppercase">
                        Feedback
                      </span>
                      <p className="mt-1 text-sm text-navy/80">
                        {p.evaluacion}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </section>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => nuevaSesion(true)}
            className="flex-1 rounded-xl bg-gold py-3 text-center font-bold text-white shadow hover:bg-gold/90 transition-colors"
          >
            🎙️ Nueva sesión con {interrogadorActivo.nombre}
          </button>
          <button
            onClick={() => nuevaSesion(false)}
            className="flex-1 rounded-xl border-2 border-navy bg-white py-3 text-center font-bold text-navy hover:bg-navy/5 transition-colors"
          >
            🔄 Cambiar interrogador
          </button>
        </div>
        <a
          href="/dashboard"
          className="block text-center text-sm text-navy/50 hover:text-navy transition-colors"
        >
          ← Volver al dashboard
        </a>
      </div>
    );
  }

  return null;
}
