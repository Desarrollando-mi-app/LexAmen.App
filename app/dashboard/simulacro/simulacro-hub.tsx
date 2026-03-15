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
    ? "ring-gz-sage"
    : resultColor === "red"
    ? "ring-gz-burgundy"
    : animando
    ? "ring-gz-gold animate-pulse"
    : "ring-gz-rule";

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
    BASICO: "bg-gz-sage/[0.15] text-gz-sage",
    INTERMEDIO: "bg-gz-gold/[0.15] text-gz-gold",
    AVANZADO: "bg-gz-burgundy/[0.15] text-gz-burgundy",
  };
  const labels: Record<string, string> = {
    BASICO: "Básico",
    INTERMEDIO: "Intermedio",
    AVANZADO: "Avanzado",
  };
  return (
    <span className={`inline-flex rounded-sm px-2.5 py-0.5 font-ibm-mono text-[9px] uppercase tracking-[1px] font-semibold ${colors[nivel] || "bg-gz-rule/30 text-gz-ink-mid"}`}>
      {labels[nivel] || nivel}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────

export function SimulacroHub({ userName, avatarUrl, sesionesRecientes }: Props) {
  const [pantalla, setPantalla] = useState<Pantalla>("config");

  // ── Config state
  const [interrogadorSeleccionado, setInterrogadorSeleccionado] = useState<string | null>(null);
  const [bioExpandida, setBioExpandida] = useState<string | null>(null);
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

  // ── Reportar problema state
  const [reporteOpen, setReporteOpen] = useState(false);
  const [reporteTipo, setReporteTipo] = useState("sistema");
  const [reporteDesc, setReporteDesc] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);

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

  // ── Enviar reporte
  const enviarReporte = async () => {
    if (!sesionId) return;
    setEnviandoReporte(true);
    try {
      const res = await fetch("/api/simulacro/reporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionId,
          tipo: reporteTipo,
          descripcion: reporteDesc || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Reporte enviado. Gracias por tu feedback.");
      setReporteOpen(false);
      setReporteTipo("sistema");
      setReporteDesc("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar reporte");
    } finally {
      setEnviandoReporte(false);
    }
  };

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
          <h1 className="font-cormorant text-[24px] !font-bold text-gz-ink">
            Simulacro de Interrogación
          </h1>
          <p className="mt-1 font-archivo text-[14px] text-gz-ink-mid">
            Practica con un interrogador IA antes de tu examen de grado
          </p>
        </div>

        {/* Paso A: Elegir interrogador */}
        <section className="space-y-3">
          <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
            1. Elige tu interrogador
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(INTERROGADORES).map((int) => {
              const selected = interrogadorSeleccionado === int.id;
              const bioOpen = bioExpandida === int.id;
              return (
                <div
                  key={int.id}
                  className={`rounded-[4px] transition-all ${
                    selected
                      ? "border-2 border-gz-gold bg-gz-gold/[0.04]"
                      : "border border-gz-rule bg-white hover:border-gz-gold hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => setInterrogadorSeleccionado(int.id)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    <AvatarInterrogador interrogador={int} size="md" />
                    <div className="min-w-0 flex-1">
                      <span className="font-cormorant text-[16px] font-bold text-gz-ink block">
                        {int.nombre}
                      </span>
                      <span className="font-cormorant text-[13px] italic text-gz-ink-mid block mt-0.5">
                        {int.tagline}
                      </span>
                      <span className="font-archivo text-[12px] text-gz-ink-mid leading-relaxed block mt-1">
                        {int.descripcion}
                      </span>
                    </div>
                    {selected && (
                      <span className="shrink-0 text-gz-gold text-lg">✓</span>
                    )}
                  </button>

                  {/* Conocer más / Biografía */}
                  <div className="border-t border-gz-rule">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBioExpandida(bioOpen ? null : int.id);
                      }}
                      className="w-full px-4 py-2 text-[11px] font-medium text-gz-ink-light hover:text-gz-ink-mid transition-colors flex items-center justify-center gap-1"
                    >
                      {bioOpen ? "Cerrar ↑" : "Conocer más ↓"}
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: bioOpen ? "200px" : "0px",
                        opacity: bioOpen ? 1 : 0,
                      }}
                    >
                      <div className="px-4 pb-4 max-h-[160px] overflow-y-auto">
                        <p className="font-archivo text-[12px] leading-relaxed text-gz-ink-mid">
                          {int.biografia}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Paso B: Elegir fuente */}
        {interrogadorSeleccionado && (
          <section className="space-y-3">
            <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
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
                className={`flex flex-col items-start gap-2 rounded-[4px] p-5 text-left transition-all ${
                  fuente === "INDICE_MAESTRO"
                    ? "border-2 border-gz-gold bg-gz-gold/[0.04]"
                    : "border border-gz-rule bg-white hover:border-gz-gold"
                }`}
              >
                <span className="text-3xl">📚</span>
                <span className="font-cormorant text-[16px] font-bold text-gz-ink">Índice Maestro</span>
                <span className="font-archivo text-[13px] text-gz-ink-mid">
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
                className={`flex flex-col items-start gap-2 rounded-[4px] p-5 text-left transition-all ${
                  fuente === "APUNTES_PROPIOS"
                    ? "border-2 border-gz-gold bg-gz-gold/[0.04]"
                    : "border border-gz-rule bg-white hover:border-gz-gold"
                }`}
              >
                <span className="text-3xl">📄</span>
                <span className="font-cormorant text-[16px] font-bold text-gz-ink">Mis Apuntes</span>
                <span className="font-archivo text-[13px] text-gz-ink-mid">
                  Sube tus propios apuntes (PDF o DOCX)
                </span>
              </button>
            </div>

            {/* Selectores del Índice Maestro */}
            {fuente === "INDICE_MAESTRO" && (
              <div className="grid gap-3 sm:grid-cols-3 rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
                <div>
                  <label className="mb-1.5 block font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                    Rama
                  </label>
                  <select
                    value={rama}
                    onChange={(e) => {
                      setRama(e.target.value);
                      setLibro("");
                      setTitulo("");
                    }}
                    className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink"
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
                  <label className="mb-1.5 block font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                    Libro
                  </label>
                  <select
                    value={libro}
                    onChange={(e) => {
                      setLibro(e.target.value);
                      setTitulo("");
                    }}
                    disabled={!rama}
                    className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink disabled:opacity-50"
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
                  <label className="mb-1.5 block font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                    Título
                  </label>
                  <select
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    disabled={!libro}
                    className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink disabled:opacity-50"
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
              <div className="rounded-[4px] border border-gz-rule p-4 space-y-3" style={{ backgroundColor: "var(--gz-cream)" }}>
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
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-[4px] border-2 border-dashed border-gz-gold/40 p-8 text-center hover:border-gz-gold hover:bg-gz-gold/[0.04] transition-colors"
                >
                  {uploadingApuntes ? (
                    <div className="animate-spin text-2xl">⏳</div>
                  ) : (
                    <>
                      <span className="text-3xl">📤</span>
                      <span className="font-archivo text-[14px] font-medium text-gz-ink">
                        Arrastra tu archivo aquí o haz clic
                      </span>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                        PDF o DOCX — máx 10MB
                      </span>
                    </>
                  )}
                </div>
                {apuntesNombre && (
                  <div className="rounded-[4px] bg-white p-3 border border-gz-rule">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📎</span>
                      <span className="font-archivo text-[14px] font-medium text-gz-ink">
                        {apuntesNombre}
                      </span>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                        ({apuntesTexto.length.toLocaleString()} chars)
                      </span>
                    </div>
                    <p className="mt-2 font-archivo text-[12px] text-gz-ink-mid line-clamp-3">
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
            <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
              3. Número de preguntas
            </h2>
            <div className="flex gap-3">
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalPreguntas(n)}
                  className={`rounded-full px-5 py-2 font-archivo text-[13px] font-semibold transition-all ${
                    totalPreguntas === n
                      ? "border border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                      : "bg-white border border-gz-rule text-gz-ink-mid hover:border-gz-gold"
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
              className="w-full rounded-[4px] bg-gz-navy py-4 font-archivo text-[16px] font-bold text-white shadow-sm hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
            >
              {creandoSesion ? "Preparando sesión..." : "Iniciar Simulacro"}
            </button>
          )}

        {/* Sesiones recientes */}
        {sesionesRecientes.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
              Sesiones recientes
            </h2>
            <div className="space-y-2">
              {sesionesRecientes.map((s) => {
                const int = INTERROGADORES[s.interrogadorId];
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-[4px] border border-gz-rule bg-white p-3"
                  >
                    {int && <AvatarInterrogador interrogador={int} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-archivo text-[13px] font-medium text-gz-ink">
                        {int?.nombre || s.interrogadorId}
                      </span>
                      <div className="flex items-center gap-2 font-ibm-mono text-[10px] text-gz-ink-light">
                        <span>
                          {s.correctas}/{s.totalPreguntas}
                        </span>
                        <NivelBadge nivel={s.nivelActual} />
                        {!s.completada && (
                          <span className="text-gz-gold">En curso</span>
                        )}
                      </div>
                    </div>
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light">
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
              <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
                {interrogadorActivo.nombre}
              </h2>
              {preguntaActiva && (
                <div className="flex items-center gap-2">
                  <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
                    Pregunta {preguntaActiva.numero}/{preguntaActiva.totalPreguntas}
                  </span>
                  <NivelBadge nivel={preguntaActiva.nivel} />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReporteOpen(true)}
              className="font-archivo text-[13px] text-gz-ink-light hover:text-gz-gold transition-colors"
              title="Reportar problema"
            >
              ⚑
            </button>
            <button
              onClick={() => nuevaSesion()}
              className="font-archivo text-[13px] text-gz-ink-light hover:text-gz-burgundy transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-6 h-1 w-full rounded-sm bg-gz-cream-dark overflow-hidden">
          <div
            className="h-full rounded-sm bg-gz-gold transition-all duration-500"
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
                <p className="font-archivo text-[14px] text-gz-ink-mid animate-pulse">
                  Formulando pregunta...
                </p>
              </div>
            ) : preguntaActiva ? (
              <div className="space-y-4">
                {/* Avatar + pregunta */}
                <div className="flex flex-col items-center space-y-4 rounded-[4px] border border-gz-rule bg-white p-6 shadow-sm">
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
                  <p className="text-center font-cormorant text-[18px] lg:text-[20px] text-gz-ink leading-relaxed max-w-2xl">
                    {preguntaActiva.preguntaTexto}
                  </p>

                  {/* Botón reproducir audio */}
                  {preguntaActiva.audioUrl && (
                    <button
                      onClick={() => reproducirAudio(preguntaActiva.audioUrl!)}
                      className="flex items-center gap-1.5 rounded-full bg-gz-navy/10 px-4 py-1.5 font-archivo text-[13px] text-gz-ink hover:bg-gz-navy/20 transition-colors"
                    >
                      {audioPlaying ? "Reproduciendo..." : "Escuchar"}
                    </button>
                  )}

                  {/* Feedback del interrogador */}
                  {evaluacion && (
                    <div
                      className={`w-full rounded-[4px] p-4 ${
                        evaluacion.correcta
                          ? "bg-gz-sage/[0.06] border-l-[3px] border-gz-sage"
                          : "bg-gz-burgundy/[0.06] border-l-[3px] border-gz-burgundy"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">
                          {evaluacion.correcta ? "✅" : "❌"}
                        </span>
                        <div>
                          <p className="font-cormorant text-[15px] text-gz-ink leading-[1.65]">
                            {evaluacion.feedback}
                          </p>
                          <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
                            Concepto: {evaluacion.conceptoClave}
                          </p>
                        </div>
                      </div>
                      {evaluacion.feedbackAudioUrl && (
                        <button
                          onClick={() =>
                            reproducirAudio(evaluacion.feedbackAudioUrl!)
                          }
                          className="mt-2 font-ibm-mono text-[10px] text-gz-ink-light hover:text-gz-ink transition-colors"
                        >
                          Escuchar feedback
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
                      className="w-full rounded-[4px] border border-gz-rule bg-white p-4 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 disabled:opacity-50 resize-none"
                    />
                    <button
                      onClick={enviarRespuesta}
                      disabled={
                        enviandoRespuesta || !respuestaTexto.trim()
                      }
                      className="w-full rounded-[4px] bg-gz-gold py-3 font-archivo text-[14px] font-bold text-white shadow hover:bg-gz-gold/90 transition-colors disabled:opacity-50"
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
                    className="w-full rounded-[4px] bg-gz-navy py-3 font-archivo text-[14px] font-bold text-white shadow hover:bg-gz-gold hover:text-gz-navy transition-colors"
                  >
                    {evaluacion.sesionCompletada
                      ? "Ver resultados"
                      : "Siguiente pregunta →"}
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:flex w-56 flex-col gap-4">
            {/* Mini avatar usuario */}
            <div className="flex flex-col items-center gap-2 rounded-[4px] border border-gz-rule bg-white p-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-gz-rule"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gz-navy/10 text-xl font-bold text-gz-ink">
                  {userName.charAt(0)}
                </div>
              )}
              <span className="font-archivo text-[13px] font-medium text-gz-ink">{userName}</span>
            </div>

            {/* Stats */}
            <div className="rounded-[4px] border border-gz-rule bg-white p-4 space-y-3">
              <h3 className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[1.5px]">
                Progreso
              </h3>
              <div className="flex items-center justify-between">
                <span className="font-archivo text-[13px] text-gz-ink-mid">Correctas</span>
                <span className="font-cormorant text-[20px] !font-bold text-gz-sage">
                  {statsActivas.correctas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-archivo text-[13px] text-gz-ink-mid">Incorrectas</span>
                <span className="font-cormorant text-[20px] !font-bold text-gz-burgundy">
                  {statsActivas.incorrectas}
                </span>
              </div>
              <div className="pt-2 border-t border-gz-rule">
                <span className="font-ibm-mono text-[10px] text-gz-ink-light">Nivel actual</span>
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
        <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-gz-rule px-4 py-2 lg:hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
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

        {/* Modal Reportar problema */}
        {reporteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-[4px] bg-white p-6 shadow-xl">
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">Reportar problema</h3>
              <p className="mt-1 font-archivo text-[12px] text-gz-ink-light">
                Ayúdanos a mejorar. Describe qué salió mal.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">Tipo</label>
                  <select
                    value={reporteTipo}
                    onChange={(e) => setReporteTipo(e.target.value)}
                    className="mt-1 w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink"
                  >
                    <option value="sistema">Problema del sistema (error, lentitud)</option>
                    <option value="contenido">Contenido incorrecto (pregunta o evaluación errada)</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={reporteDesc}
                    onChange={(e) => setReporteDesc(e.target.value)}
                    placeholder="Describe brevemente el problema..."
                    rows={3}
                    maxLength={500}
                    className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none resize-none"
                  />
                  <p className="mt-0.5 text-right font-ibm-mono text-[10px] text-gz-ink-light">
                    {reporteDesc.length}/500
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setReporteOpen(false);
                    setReporteDesc("");
                  }}
                  className="flex-1 rounded-[3px] border border-gz-rule py-2 font-archivo text-[13px] font-medium text-gz-ink-mid hover:bg-gz-ink/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarReporte}
                  disabled={enviandoReporte}
                  className="flex-1 rounded-[3px] bg-gz-gold py-2 font-archivo text-[13px] font-bold text-white hover:bg-gz-gold/90 transition-colors disabled:opacity-50"
                >
                  {enviandoReporte ? "Enviando..." : "Enviar reporte"}
                </button>
              </div>
            </div>
          </div>
        )}
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
        <div className="flex flex-col items-center gap-4 rounded-[4px] border border-gz-rule bg-white p-8 text-center shadow-sm">
          <AvatarInterrogador interrogador={interrogadorActivo} size="lg" />
          <h2 className="font-cormorant text-[24px] !font-bold text-gz-ink">Sesión completada</h2>

          {r && (
            <>
              {/* Score */}
              <div className="flex items-baseline gap-2">
                <span className="font-cormorant text-[48px] !font-bold text-gz-ink">
                  {r.correctas}
                </span>
                <span className="font-cormorant text-[24px] text-gz-ink-light">/ {r.total}</span>
              </div>
              <div className="font-ibm-mono text-[14px] text-gz-ink-mid uppercase tracking-[1px]">{porcentaje}% correcto</div>

              {/* Nivel + XP */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="font-ibm-mono text-[10px] text-gz-ink-light">Nivel final</span>
                  <div className="mt-1">
                    <NivelBadge nivel={r.nivelFinal} />
                  </div>
                </div>
                <div className="h-8 w-px bg-gz-rule" />
                <div className="text-center">
                  <span className="font-ibm-mono text-[10px] text-gz-ink-light">XP ganado</span>
                  <div className="mt-1 font-cormorant text-[20px] !font-bold text-gz-gold">
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
                      p.correcta ? "bg-gz-sage" : "bg-gz-burgundy"
                    }`}
                    title={`P${i + 1}: ${p.correcta ? "Correcta" : "Incorrecta"}`}
                  />
                ))}
              </div>
              <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                Verde = correcta · Rojo = incorrecta
              </p>
            </>
          )}
        </div>

        {/* Detalle por pregunta */}
        {r && (
          <section className="space-y-3">
            <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">
              Detalle por pregunta
            </h3>
            {r.preguntas.map((p, i) => (
              <details
                key={i}
                className="group rounded-[4px] border border-gz-rule bg-white overflow-hidden"
              >
                <summary className="flex cursor-pointer items-center gap-3 p-4 hover:bg-gz-cream-dark transition-colors">
                  <span className="text-lg">
                    {p.correcta ? "✅" : "❌"}
                  </span>
                  <span className="flex-1 font-archivo text-[13px] font-medium text-gz-ink line-clamp-1">
                    P{i + 1}. {p.preguntaTexto}
                  </span>
                  <NivelBadge nivel={p.nivel} />
                  <span className="text-gz-ink-light group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="border-t border-gz-rule p-4 space-y-3" style={{ backgroundColor: "var(--gz-cream)" }}>
                  <div>
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[1.5px]">
                      Pregunta
                    </span>
                    <p className="mt-1 font-archivo text-[13px] text-gz-ink">
                      {p.preguntaTexto}
                    </p>
                  </div>
                  {p.respuestaUser && (
                    <div>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[1.5px]">
                        Tu respuesta
                      </span>
                      <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
                        {p.respuestaUser}
                      </p>
                    </div>
                  )}
                  {p.evaluacion && (
                    <div>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[1.5px]">
                        Feedback
                      </span>
                      <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
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
            className="flex-1 rounded-[4px] bg-gz-gold py-3 text-center font-archivo font-bold text-white shadow hover:bg-gz-gold/90 transition-colors"
          >
            Nueva sesión con {interrogadorActivo.nombre}
          </button>
          <button
            onClick={() => nuevaSesion(false)}
            className="flex-1 rounded-[4px] border border-gz-rule bg-white py-3 text-center font-archivo font-bold text-gz-ink hover:border-gz-gold hover:text-gz-gold transition-colors"
          >
            Cambiar interrogador
          </button>
        </div>
        <a
          href="/dashboard"
          className="block text-center font-archivo text-[13px] text-gz-ink-light hover:text-gz-ink transition-colors"
        >
          ← Volver al dashboard
        </a>
      </div>
    );
  }

  return null;
}
