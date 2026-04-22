"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/app/dashboard/components/theme-toggle";
import { GzMastheadNav } from "@/app/dashboard/components/gz-masthead-nav";

// ─── Types ──────────────────────────────────────────────────

interface Noticia {
  id: string;
  tipo: string;
  imagenUrl: string;
  imagenPosicion: string;
  overlayOpacidad: number;
  titulo: string;
  subtitulo: string | null;
  ctaTexto: string;
  ctaUrl: string;
  ctaExterno: boolean;
}

interface Autor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
}

interface Destacados {
  mejorObiter: {
    id: string;
    content: string;
    tipo: string | null;
    apoyos: number;
    citasCount: number;
    createdAt: string;
    autor: Autor;
  } | null;
  mejorAnalisis: {
    id: string;
    titulo: string;
    resumen: string;
    materia: string;
    apoyos: number;
    createdAt: string;
    autor: Autor;
  } | null;
}

interface RankingEntry {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  weeklyXp: number;
  universidad: string | null;
  grado?: number;
  gradoEmoji?: string;
  gradoNombre?: string;
}

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  organizador: string;
  fecha: string;
  fechaFin: string | null;
  hora: string | null;
  formato: string;
  lugar: string | null;
  costo: string;
  materias: string | null;
  creador: string;
}

interface Sponsor {
  id: string;
  nombre: string;
  titulo: string | null;
  descripcion: string | null;
  imagenUrl: string | null;
  linkUrl: string | null;
  posicion: string;
}

interface ExpedienteActivo {
  id: string;
  numero: number;
  titulo: string;
  pregunta: string;
  fechaCierre: string;
  rama: string;
  argumentosCount: number;
}

interface NoticiaJuridica {
  id: string;
  titulo: string;
  resumen: string | null;
  urlFuente: string;
  fuente: string;
  fuenteNombre: string;
  destacada: boolean;
  fechaAprobacion: string | null;
}

interface TopAutorEntry {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  score: number;
  gradoEmoji: string;
  grado: number;
}

interface PortadaData {
  noticias: Noticia[];
  destacados: Destacados;
  ranking: {
    top: RankingEntry[];
    miPosicion?: number;
    miXp?: number;
  };
  topAutores: TopAutorEntry[];
  eventos: Evento[];
  sponsors: Sponsor[];
  stats: {
    totalUsuarios: number;
    totalPublicaciones: number;
    usuariosActivosHoy: number;
  };
  expedienteActivo: ExpedienteActivo | null;
  noticiasJuridicas: NoticiaJuridica[];
  isLoggedIn: boolean;
  userName?: string;
}

// ─── Helpers ────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatFechaEditorial(): string {
  const now = new Date();
  return `${DIAS[now.getDay()]} ${now.getDate()} de ${MESES[now.getMonth()]}, ${now.getFullYear()}`;
}

const FORMATO_LABELS: Record<string, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrido: "Híbrido",
};

function handleSponsorClick(sponsorId: string) {
  fetch("/api/sponsors/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sponsorId }),
  }).catch(() => {});
}

/* ─── Editorial separator ─── */
function EditorialRule({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="h-[2px] bg-gz-ink" />
      <div className="mt-[3px] h-px bg-gz-ink" />
    </div>
  );
}

/* ─── Section header ─── */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light whitespace-nowrap">
          {children}
        </p>
        <div className="flex-1 h-px bg-gz-rule" />
      </div>
    </div>
  );
}

/* ─── Countdown hook ─── */
function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Cerrado"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}d ${h}h`);
      else setTimeLeft(`${h}h ${m}m`);
    }
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [targetDate]);
  return timeLeft;
}

/* ─── Expediente card ─── */
function ExpedienteCard({ expediente, isLoggedIn }: { expediente: ExpedienteActivo; isLoggedIn: boolean }) {
  const countdown = useCountdown(expediente.fechaCierre);
  return (
    <div
      className="rounded-[3px] p-5"
      style={{ borderLeft: "4px solid var(--gz-gold)", backgroundColor: "rgba(var(--gz-gold-rgb, 154, 114, 48), 0.04)" }}
    >
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2">
        Expediente Abierto N.{expediente.numero}
      </p>
      <h3 className="font-cormorant text-[22px] lg:text-[26px] !font-bold text-gz-ink leading-snug mb-3">
        {expediente.titulo}
      </h3>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <span className="font-ibm-mono text-[10px] text-gz-ink-mid">
          Cierra en: <span className="font-semibold text-gz-ink">{countdown}</span>
        </span>
        <span className="font-ibm-mono text-[10px] text-gz-ink-mid">
          {expediente.argumentosCount} argumento{expediente.argumentosCount !== 1 ? "s" : ""}
        </span>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[0.5px] text-gz-ink-light px-1.5 py-0.5 bg-gz-cream-dark rounded-sm">
          {expediente.rama}
        </span>
      </div>
      <Link
        href={isLoggedIn ? `/dashboard/diario/expediente/${expediente.id}` : "/login"}
        className="inline-block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
      >
        Leer y argumentar &rarr;
      </Link>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export function PortadaClient({ data }: { data: PortadaData }) {
  const {
    noticias,
    destacados,
    ranking,
    topAutores,
    eventos,
    sponsors,
    stats,
    expedienteActivo,
    noticiasJuridicas,
    isLoggedIn,
    userName,
  } = data;

  const titularNoticia = noticias[0] ?? null;
  const secundarias = noticias.slice(1);
  const lateralSponsor = sponsors.find((s) => s.posicion === "lateral");

  return (
    <main className="gz-page min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      {/* ═══ MASTHEAD ═══ */}
      <header>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Top bar */}
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link href="/portada" className="flex items-center gap-3 sm:gap-4">
              <Image
                src="/brand/logo-isotipo.svg"
                alt="Studio Iuris"
                width={80}
                height={80}
                className="h-[50px] w-[50px] sm:h-[70px] sm:w-[70px] lg:h-[80px] lg:w-[80px] rounded-full"
                priority
              />
              <div>
                <div className="font-archivo text-[18px] sm:text-[22px] font-bold tracking-[3px] text-gz-ink leading-none">
                  Studio
                </div>
                <div className="font-cormorant text-[22px] sm:text-[28px] lg:text-[32px] !font-bold tracking-[5px] text-gz-red uppercase leading-none mt-[-2px]">
                  IURIS
                </div>
              </div>
            </Link>

            {/* Right side: date (desktop) + auth buttons */}
            <div className="flex flex-col items-end gap-1">
              <p className="hidden lg:block font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                {formatFechaEditorial()} · Edición Diaria
              </p>
              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1 rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[11px] font-semibold uppercase tracking-[0.5px] text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                  >
                    Escritorio
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="rounded-[3px] px-3 py-2 font-archivo text-[11px] font-medium uppercase tracking-[0.5px] text-gz-ink-mid hover:text-gz-ink transition-colors"
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-[3px] bg-gz-gold px-4 py-2 font-archivo text-[11px] font-semibold uppercase tracking-[0.5px] text-white hover:bg-gz-navy transition-colors"
                    >
                      Registrarse
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="font-cormorant italic text-[13px] sm:text-[15px] text-gz-ink-mid -mt-1 mb-1">
            Plataforma de aprendizaje jurídico
          </p>

          {/* Mobile date */}
          <p className="lg:hidden font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
            {formatFechaEditorial()} · Edición Diaria
          </p>

          {/* Section nav */}
          <GzMastheadNav />
        </div>

        {/* Double line separator */}
        <EditorialRule className="mt-1" />
      </header>

      {/* ═══ CONTENT ═══ */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-8">
        {/* Bienvenida (solo logueado) */}
        {isLoggedIn && userName && (
          <p className="font-cormorant italic text-[16px] text-gz-ink-mid mb-5">
            Bienvenido de vuelta, <span className="not-italic font-semibold text-gz-ink">{userName}</span>
          </p>
        )}

        {/* ─── TITULAR + RANKING ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0 mb-0">
          {/* Titular principal */}
          <div className="lg:pr-6 lg:border-r lg:border-gz-rule">
            {titularNoticia ? (
              <div>
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-3">
                  {titularNoticia.tipo === "noticia" ? "Nuevo en Studio Iuris" : "Destacado"}
                </p>
                <h2 className="font-cormorant text-[34px] lg:text-[40px] !font-bold leading-[1.15] text-gz-ink mb-4">
                  {titularNoticia.titulo}
                </h2>
                {titularNoticia.subtitulo && (
                  <p
                    className="font-cormorant italic text-[16px] text-gz-ink-mid mb-5 pl-4 max-w-xl"
                    style={{ borderLeftWidth: 3, borderLeftColor: "var(--gz-gold)" }}
                  >
                    {titularNoticia.subtitulo}
                  </p>
                )}
                {titularNoticia.imagenUrl && (
                  <div
                    className="w-full h-[200px] sm:h-[260px] rounded-[3px] bg-cover bg-center mb-5"
                    style={{
                      backgroundImage: `url(${titularNoticia.imagenUrl})`,
                      backgroundPosition: titularNoticia.imagenPosicion,
                    }}
                  />
                )}
                <div>
                  <Link
                    href={titularNoticia.ctaUrl}
                    className="inline-block rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[11px] font-semibold uppercase tracking-[1px] text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                    target={titularNoticia.ctaExterno ? "_blank" : undefined}
                  >
                    {titularNoticia.ctaTexto} →
                  </Link>
                </div>
              </div>
            ) : (
              /* Fallback */
              <div>
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-3">
                  Studio Iuris
                </p>
                <h2 className="font-cormorant text-[34px] lg:text-[40px] !font-bold leading-[1.15] text-gz-ink mb-4">
                  Prepara tu examen de grado con las mejores herramientas
                </h2>
                <p
                  className="font-cormorant italic text-[16px] text-gz-ink-mid max-w-lg mb-5 pl-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: "var(--gz-gold)" }}
                >
                  Flashcards, selección múltiple, simulacro oral con IA, causas 1v1 y más.
                </p>
                <div>
                  <Link
                    href={isLoggedIn ? "/dashboard" : "/register"}
                    className="inline-block rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[11px] font-semibold uppercase tracking-[1px] text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                  >
                    {isLoggedIn ? "Ir al Escritorio →" : "Comenzar gratis →"}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Ranking sidebar */}
          <div className="mt-6 lg:mt-0 lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-gz-rule">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[14px]">🏆</span>
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
                Liga Semanal
              </p>
            </div>

            <div className="h-px bg-gz-rule mb-4" />

            {ranking.top.length > 0 ? (
              <div className="space-y-3">
                {ranking.top.map((entry, i) => (
                  <div key={entry.userId} className="flex items-center gap-3">
                    <span className={`font-cormorant text-[18px] !font-bold w-5 text-right ${i === 0 ? "text-gz-gold" : i === 1 ? "text-gz-ink-mid" : "text-gz-ink-light"}`}>
                      {i + 1}
                    </span>
                    {entry.avatarUrl ? (
                      <Image src={entry.avatarUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gz-cream-dark flex items-center justify-center font-archivo text-[10px] font-bold text-gz-ink-mid">
                        {entry.firstName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-archivo text-[13px] font-medium text-gz-ink truncate">
                        {entry.firstName} {entry.lastName.charAt(0)}.
                      </p>
                      <p className="font-ibm-mono text-[9px] text-gz-ink-light truncate">
                        {entry.gradoEmoji && entry.gradoNombre && (
                          <span>{entry.gradoEmoji} Grado {entry.grado}{entry.universidad ? " · " : ""}</span>
                        )}
                        {entry.universidad ?? ""}
                      </p>
                    </div>
                    <span className="font-ibm-mono text-[11px] font-medium text-gz-gold shrink-0">
                      {entry.weeklyXp} XP
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-cormorant italic text-[14px] text-gz-ink-light">
                Sin actividad esta semana aún
              </p>
            )}

            {/* User position */}
            {isLoggedIn && ranking.miPosicion && (
              <div className="mt-4 pt-3 border-t border-gz-rule">
                <p className="font-ibm-mono text-[11px] text-gz-ink-mid">
                  Tu posición: <span className="font-semibold text-gz-gold">#{ranking.miPosicion}</span>
                  {ranking.miXp !== undefined && (
                    <span className="ml-2 text-gz-ink-light">· {ranking.miXp} XP</span>
                  )}
                </p>
              </div>
            )}

            <Link
              href={isLoggedIn ? "/dashboard/ranking" : "/login"}
              className="mt-4 block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
            >
              Ver liga completa →
            </Link>
          </div>
        </div>

        {/* ─── SEPARADOR ─── */}
        <EditorialRule className="my-8" />

        {/* ─── DESTACADOS DE PUBLICACIONES ─── */}
        <SectionHeader>Destacados de Publicaciones</SectionHeader>

        {(destacados.mejorObiter || destacados.mejorAnalisis) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mb-0">
            {/* Mejor Obiter */}
            <div className={`pb-6 md:pb-0 ${destacados.mejorAnalisis ? "md:pr-6 md:border-r md:border-gz-rule border-b md:border-b-0 border-gz-rule" : ""}`}>
              {destacados.mejorObiter ? (
                <>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold mb-3">
                    Obiter de la Semana
                  </p>
                  <blockquote className="font-cormorant italic text-[17px] text-gz-ink leading-relaxed mb-4 line-clamp-3">
                    &ldquo;{destacados.mejorObiter.content.length > 200
                      ? destacados.mejorObiter.content.slice(0, 200) + "..."
                      : destacados.mejorObiter.content}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-2 mb-2">
                    {destacados.mejorObiter.autor.avatarUrl ? (
                      <Image src={destacados.mejorObiter.autor.avatarUrl} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gz-cream-dark flex items-center justify-center font-archivo text-[9px] font-bold text-gz-ink-mid">
                        {destacados.mejorObiter.autor.firstName[0]}
                      </div>
                    )}
                    <span className="font-archivo text-[12px] text-gz-ink-mid">
                      {destacados.mejorObiter.autor.firstName} {destacados.mejorObiter.autor.lastName.charAt(0)}.
                      {destacados.mejorObiter.autor.universidad && ` · ${destacados.mejorObiter.autor.universidad}`}
                    </span>
                  </div>
                  <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                    {destacados.mejorObiter.apoyos} apoyos · {destacados.mejorObiter.citasCount} citas
                  </p>
                  {isLoggedIn && (
                    <Link
                      href={`/dashboard/diario/obiter/${destacados.mejorObiter.id}`}
                      className="mt-3 inline-block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                    >
                      Leer →
                    </Link>
                  )}
                </>
              ) : (
                <p className="font-cormorant italic text-[14px] text-gz-ink-light">
                  Sin obiters destacados esta semana
                </p>
              )}
            </div>

            {/* Mejor Análisis */}
            <div className="pt-6 md:pt-0 md:pl-6">
              {destacados.mejorAnalisis ? (
                <>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold mb-3">
                    Análisis Destacado
                  </p>
                  <h3 className="font-cormorant text-[22px] !font-bold text-gz-ink leading-snug mb-2">
                    {destacados.mejorAnalisis.titulo}
                  </h3>
                  {destacados.mejorAnalisis.resumen && (
                    <p className="font-archivo text-[13px] text-gz-ink-mid leading-relaxed mb-3 line-clamp-3">
                      {destacados.mejorAnalisis.resumen}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    {destacados.mejorAnalisis.autor.avatarUrl ? (
                      <Image src={destacados.mejorAnalisis.autor.avatarUrl} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gz-cream-dark flex items-center justify-center font-archivo text-[9px] font-bold text-gz-ink-mid">
                        {destacados.mejorAnalisis.autor.firstName[0]}
                      </div>
                    )}
                    <span className="font-archivo text-[12px] text-gz-ink-mid">
                      {destacados.mejorAnalisis.autor.firstName} {destacados.mejorAnalisis.autor.lastName.charAt(0)}.
                      {destacados.mejorAnalisis.autor.universidad && ` · ${destacados.mejorAnalisis.autor.universidad}`}
                    </span>
                  </div>
                  <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                    {destacados.mejorAnalisis.apoyos} apoyos
                  </p>
                  {isLoggedIn && (
                    <Link
                      href={`/dashboard/diario/analisis/${destacados.mejorAnalisis.id}`}
                      className="mt-3 inline-block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                    >
                      Leer →
                    </Link>
                  )}
                </>
              ) : (
                <p className="font-cormorant italic text-[14px] text-gz-ink-light">
                  Sin análisis destacados esta semana
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="md:pr-6 md:border-r md:border-gz-rule">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold mb-3">
                Obiter de la Semana
              </p>
              <p className="font-cormorant italic text-[14px] text-gz-ink-light">
                Sin obiters destacados esta semana
              </p>
            </div>
            <div className="pt-6 md:pt-0 md:pl-6">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold mb-3">
                Análisis Destacado
              </p>
              <p className="font-cormorant italic text-[14px] text-gz-ink-light">
                Sin análisis destacados esta semana
              </p>
            </div>
          </div>
        )}

        {/* ─── TOP AUTORES DEL MES ─── */}
        {topAutores.length > 0 && (
          <>
            <EditorialRule className="my-8" />
            <SectionHeader>Top Autores del Mes</SectionHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topAutores.map((autor, i) => (
                <div
                  key={autor.userId}
                  className="flex items-center gap-3 rounded-[3px] border border-gz-rule bg-white p-4"
                >
                  <span
                    className={`font-cormorant text-[22px] !font-bold shrink-0 ${
                      i === 0 ? "text-gz-gold" : i === 1 ? "text-gz-ink-mid" : "text-[#b87333]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {autor.avatarUrl ? (
                    <Image
                      src={autor.avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gz-cream-dark flex items-center justify-center font-archivo text-[10px] font-bold text-gz-ink-mid shrink-0">
                      {autor.firstName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-archivo text-[13px] font-semibold text-gz-ink truncate">
                      {autor.firstName} {autor.lastName.charAt(0)}.
                    </p>
                    <p className="font-ibm-mono text-[9px] text-gz-ink-light">
                      {autor.gradoEmoji} Grado {autor.grado}
                    </p>
                  </div>
                  <span className="font-ibm-mono text-[12px] font-bold text-gz-gold shrink-0">
                    {Math.round(autor.score)} pts
                  </span>
                </div>
              ))}
            </div>

            <Link
              href={isLoggedIn ? "/dashboard/diario/ranking" : "/login"}
              className="mt-4 inline-block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
            >
              Ver ranking completo &rarr;
            </Link>
          </>
        )}

        {/* ─── EXPEDIENTE ABIERTO ─── */}
        {expedienteActivo && (
          <>
            <EditorialRule className="my-8" />
            <SectionHeader>Expediente Abierto</SectionHeader>
            <ExpedienteCard expediente={expedienteActivo} isLoggedIn={isLoggedIn} />
          </>
        )}

        {/* ─── NOTICIAS JURÍDICAS ─── */}
        {noticiasJuridicas.length > 0 && (
          <>
            <EditorialRule className="my-8" />
            <SectionHeader>Noticias Jur&iacute;dicas</SectionHeader>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0">
              {/* Headline (first destacada or first noticia) */}
              <div className="lg:pr-6 lg:border-r lg:border-gz-rule pb-6 lg:pb-0">
                {(() => {
                  const headline = noticiasJuridicas.find((n) => n.destacada) ?? noticiasJuridicas[0];
                  if (!headline) return null;
                  return (
                    <>
                      {headline.destacada && (
                        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2 block">
                          &#9733; Destacada
                        </span>
                      )}
                      <h3 className="font-cormorant text-[24px] lg:text-[28px] !font-bold text-gz-ink leading-snug mb-3">
                        {headline.titulo}
                      </h3>
                      {headline.resumen && (
                        <p className="font-archivo text-[14px] text-gz-ink-mid leading-relaxed line-clamp-3 mb-3">
                          {headline.resumen}
                        </p>
                      )}
                      <p className="font-ibm-mono text-[10px] text-gz-ink-light mb-3">
                        {headline.fuenteNombre}
                      </p>
                      <a
                        href={headline.urlFuente}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                      >
                        Leer en fuente original &rarr;
                      </a>
                    </>
                  );
                })()}
              </div>

              {/* Compact list of remaining noticias */}
              <div className="lg:pl-6 pt-6 lg:pt-0 border-t lg:border-t-0 border-gz-rule">
                <div className="divide-y divide-gz-rule">
                  {noticiasJuridicas
                    .filter((n) => {
                      const headline = noticiasJuridicas.find((x) => x.destacada) ?? noticiasJuridicas[0];
                      return n.id !== headline?.id;
                    })
                    .slice(0, 3)
                    .map((n) => (
                      <div key={n.id} className="py-3 first:pt-0">
                        <h4 className="font-cormorant text-[17px] !font-bold text-gz-ink leading-snug mb-1">
                          {n.titulo}
                        </h4>
                        <p className="font-ibm-mono text-[9px] text-gz-ink-light">
                          {n.fuenteNombre}
                        </p>
                      </div>
                    ))}
                </div>

                <Link
                  href="/dashboard/noticias"
                  className="mt-4 inline-block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                >
                  Ver todas las noticias &rarr;
                </Link>
              </div>
            </div>
          </>
        )}

        {/* ─── SEPARADOR ─── */}
        <EditorialRule className="my-8" />

        {/* ─── EVENTOS + SPONSOR ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
          {/* Eventos */}
          <div className="lg:pr-6 lg:border-r lg:border-gz-rule">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[13px]">📅</span>
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
                Agenda de la Semana
              </p>
              <div className="flex-1 h-px bg-gz-rule" />
            </div>

            {eventos.length > 0 ? (
              <div className="space-y-0 divide-y divide-gz-rule">
                {eventos.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-4 py-4 first:pt-0">
                    {/* Date badge */}
                    <div className="shrink-0 w-12 text-center">
                      <p className="font-cormorant text-[24px] !font-bold text-gz-ink leading-none">
                        {new Date(ev.fecha).getDate()}
                      </p>
                      <p className="font-ibm-mono text-[9px] uppercase text-gz-ink-light mt-0.5">
                        {MESES[new Date(ev.fecha).getMonth()].slice(0, 3)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-archivo text-[14px] font-semibold text-gz-ink leading-snug">
                        {ev.titulo}
                      </h4>
                      <p className="font-archivo text-[12px] text-gz-ink-mid mt-0.5">
                        {ev.organizador}
                        {ev.lugar && ` · ${ev.lugar}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-ibm-mono text-[9px] uppercase tracking-[0.5px] text-gz-ink-light px-1.5 py-0.5 bg-gz-cream-dark rounded-sm">
                          {FORMATO_LABELS[ev.formato] ?? ev.formato}
                        </span>
                        {ev.hora && (
                          <span className="font-ibm-mono text-[10px] text-gz-ink-light">{ev.hora}</span>
                        )}
                        <span className={`font-ibm-mono text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-sm ${
                          ev.costo === "gratis"
                            ? "text-gz-sage bg-gz-sage/10"
                            : "text-gz-ink-mid bg-gz-cream-dark"
                        }`}>
                          {ev.costo === "gratis" ? "Gratis" : "Pagado"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-cormorant italic text-[14px] text-gz-ink-light py-4">
                No hay eventos programados esta semana
              </p>
            )}

            <Link
              href={isLoggedIn ? "/dashboard/sala/eventos" : "/login"}
              className="mt-4 inline-block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
            >
              Ver todos los eventos →
            </Link>
          </div>

          {/* Sponsor lateral */}
          <div className="mt-6 lg:mt-0 lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-gz-rule">
            {lateralSponsor ? (
              <div>
                <p className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light/50 mb-3">
                  Patrocinado
                </p>
                {lateralSponsor.imagenUrl && (
                  <div className="rounded-[3px] overflow-hidden mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lateralSponsor.imagenUrl}
                      alt={lateralSponsor.nombre}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
                {lateralSponsor.titulo && (
                  <h4 className="font-cormorant text-[18px] !font-bold text-gz-ink leading-snug mb-2">
                    {lateralSponsor.titulo}
                  </h4>
                )}
                {lateralSponsor.descripcion && (
                  <p className="font-archivo text-[13px] text-gz-ink-mid leading-relaxed mb-3">
                    {lateralSponsor.descripcion}
                  </p>
                )}
                {lateralSponsor.linkUrl && (
                  <a
                    href={lateralSponsor.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleSponsorClick(lateralSponsor.id)}
                    className="inline-block font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                  >
                    Ver más →
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-[3px] border border-dashed border-gz-rule p-6 text-center">
                <p className="font-cormorant italic text-[14px] text-gz-ink-light">
                  Espacio publicitario disponible
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── NOTICIAS SECUNDARIAS ─── */}
        {secundarias.length > 0 && (
          <>
            <EditorialRule className="my-8" />
            <SectionHeader>Más Noticias</SectionHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-0">
              {secundarias.map((noticia) => (
                <div key={noticia.id}>
                  {noticia.imagenUrl && (
                    <div
                      className="h-40 rounded-[3px] bg-cover bg-center mb-3"
                      style={{
                        backgroundImage: `url(${noticia.imagenUrl})`,
                        backgroundPosition: noticia.imagenPosicion,
                      }}
                    />
                  )}
                  <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink leading-snug mb-2">
                    {noticia.titulo}
                  </h3>
                  {noticia.subtitulo && (
                    <p className="font-archivo text-[13px] text-gz-ink-mid mb-3">
                      {noticia.subtitulo}
                    </p>
                  )}
                  <Link
                    href={noticia.ctaUrl}
                    className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                    target={noticia.ctaExterno ? "_blank" : undefined}
                  >
                    {noticia.ctaTexto} →
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── SEPARADOR ─── */}
        <EditorialRule className="my-8" />

        {/* ─── STATS COMUNIDAD ─── */}
        <div className="rounded-[3px] py-6 px-4 mb-8" style={{ backgroundColor: "rgba(var(--gz-gold-rgb, 154, 114, 48), 0.03)" }}>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <span className="block font-cormorant text-[24px] sm:text-[28px] !font-bold text-gz-ink">
                {stats.totalUsuarios.toLocaleString()}
              </span>
              <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                estudiantes
              </span>
            </div>
            <div className="h-8 w-px bg-gz-rule hidden sm:block" />
            <div className="text-center">
              <span className="block font-cormorant text-[24px] sm:text-[28px] !font-bold text-gz-ink">
                {stats.totalPublicaciones.toLocaleString()}
              </span>
              <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                publicaciones
              </span>
            </div>
            <div className="h-8 w-px bg-gz-rule hidden sm:block" />
            <div className="text-center">
              <span className="block font-cormorant text-[24px] sm:text-[28px] !font-bold text-gz-ink">
                {stats.usuariosActivosHoy}
              </span>
              <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                activos hoy
              </span>
            </div>
          </div>
        </div>

        {/* ─── CTA (solo si NO logueado) ─── */}
        {!isLoggedIn && (
          <div className="rounded-[3px] text-center py-12 px-6 mb-0" style={{ backgroundColor: "var(--gz-navy)" }}>
            <h2 className="font-cormorant text-[24px] sm:text-[28px] !font-bold text-white mb-3">
              Prepara tu examen de grado con Studio <span style={{ color: "var(--gz-burgundy)" }}>Iuris</span>
            </h2>
            <p className="font-archivo text-[14px] text-white/60 mb-6 max-w-md mx-auto">
              Únete a {stats.totalUsuarios.toLocaleString()} estudiantes de Derecho que ya están usando la plataforma.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="rounded-[3px] px-6 py-3 font-archivo text-[13px] font-semibold text-gz-navy hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--gz-gold)" }}
              >
                Crear cuenta gratis →
              </Link>
              <Link
                href="/login"
                className="rounded-[3px] border border-white/20 px-6 py-3 font-archivo text-[13px] font-medium text-white hover:border-white/40 transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer>
        <EditorialRule />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={20} height={20} className="h-4 w-4 opacity-40" />
            <span className="font-cormorant text-[13px] !font-bold text-gz-ink-mid">
              Studio <span className="text-gz-red">Iuris</span>
            </span>
          </div>
          <p className="font-ibm-mono text-[9px] text-gz-ink-light/50 uppercase tracking-[1.5px]">
            La Portada · studioiuris.cl · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  );
}
