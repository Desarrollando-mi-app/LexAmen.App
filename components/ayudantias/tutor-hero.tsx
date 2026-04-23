import { initials } from "@/lib/ayudantias-v4-helpers";

export interface TutorHeroProps {
  user: {
    firstName: string;
    lastName: string;
    universidad: string | null;
  };
  materiaPrincipal: string;
  etapa: "estudiante" | "egresado" | "abogado";
  region?: string | null;
  rating: number | null;
  sesionesCompletadas: number;
  desdeISO: string;
  respuestaProm?: string; // ej. "<2h"
  verificado?: boolean;
}

const ETAPA_LABELS = {
  estudiante: "Estudiante de Derecho",
  egresado: "Egresado de Derecho",
  abogado: "Abogado/a",
} as const;

export function TutorHero(props: TutorHeroProps) {
  const name = `${props.user.firstName} ${props.user.lastName}`.trim();
  const since = (() => {
    const d = new Date(props.desdeISO);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${months[d.getMonth()]}'${String(d.getFullYear()).slice(-2)}`;
  })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-10 py-11 border-b border-gz-rule">
      {/* Cover */}
      <div className="relative aspect-square border border-gz-rule flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#e5d5b2] to-[#cdb788]">
        {props.verificado && (
          <span className="absolute top-3.5 left-3.5 z-[2] px-2.5 py-[5px] bg-gz-ink/92 text-gz-cream rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-medium backdrop-blur-sm">
            <span className="text-gz-gold-bright mr-1">✓</span> Verificada
          </span>
        )}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-soft-light"
          style={{ background: "linear-gradient(180deg, rgba(245,240,230,0.12), rgba(245,240,230,0))" }}
        />
        <div className="relative z-[1] font-cormorant font-bold text-[180px] leading-none tracking-[-6px] text-gz-ink/90">
          {initials(props.user.firstName, props.user.lastName)}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col justify-center">
        <div className="font-ibm-mono text-[11px] tracking-[2px] uppercase text-gz-ink-mid mb-3">
          Tutor/a · {props.materiaPrincipal}
        </div>
        <h1 className="font-cormorant font-semibold text-[62px] leading-[0.95] tracking-[-1.5px] text-gz-ink m-0">
          {name}
        </h1>
        <p className="mt-2.5 font-cormorant italic text-[19px] text-gz-ink-mid">
          {ETAPA_LABELS[props.etapa]} — {props.user.universidad ?? "Universidad no especificada"}
          {props.region ? ` · ${props.region}` : ""}
        </p>

        {/* Stats */}
        <div className="flex mt-6 border-y border-gz-rule">
          <Stat label="Rating" value={
            <span>
              <span className="text-gz-gold">★</span>{" "}
              {props.rating ? props.rating.toFixed(1) : "—"}
            </span>
          } />
          <Stat label="Sesiones" value={String(props.sesionesCompletadas)} />
          <Stat label="Desde" value={<span className="font-cormorant">{since}</span>} />
          <Stat label="Respuesta" value={<span>&lt;{props.respuestaProm ?? "2h"}</span>} />
        </div>

        <div className="flex gap-2.5 mt-6">
          <button className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition">
            Solicitar sesión
          </button>
          <button className="px-5 py-3 border border-gz-ink text-gz-ink font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-gold hover:text-gz-gold transition">
            Enviar mensaje
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex-1 py-3.5 px-4 border-r border-gz-rule last:border-r-0">
      <div className="font-ibm-mono text-[9px] tracking-[1.4px] uppercase text-gz-ink-light">
        {label}
      </div>
      <div className="mt-1 font-cormorant text-[26px] leading-none text-gz-ink">
        {value}
      </div>
    </div>
  );
}
