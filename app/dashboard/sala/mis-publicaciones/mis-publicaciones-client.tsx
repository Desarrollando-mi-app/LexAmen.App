"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  KIND_LABELS,
  type Publication,
  type PublicationKind,
} from "@/lib/mis-publicaciones-helpers";
import { PublicacionRow } from "@/components/sala/publicacion-row";
import { PublishSheet } from "@/components/sala/publish-sheet";
import { OfertaForm } from "@/components/ofertas/oferta-form";
import { PasantiaForm } from "@/components/pasantias/pasantia-form";
import { AyudantiaForm } from "@/components/ayudantias/ayudantia-form";

type FilterKind = "TODAS" | PublicationKind;
type FilterEstado = "ACTIVAS" | "OCULTAS" | "TODAS";

interface MisPublicacionesClientProps {
  publications: Publication[];
  initialKind?: FilterKind;
}

export function MisPublicacionesClient({
  publications,
  initialKind = "TODAS",
}: MisPublicacionesClientProps) {
  const [filterKind, setFilterKind] = useState<FilterKind>(initialKind);
  const [filterEstado, setFilterEstado] = useState<FilterEstado>("ACTIVAS");
  const [query, setQuery] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // Editor inline V4: cargamos el registro completo on-demand desde el GET
  // del endpoint correspondiente y lo pasamos como `initialValues` al form.
  const [editing, setEditing] = useState<Publication | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loadingEdit, setLoadingEdit] = useState(false);

  async function openEditor(pub: Publication) {
    setEditing(pub);
    setEditingData(null);
    setLoadingEdit(true);
    try {
      const res = await fetch(pub.apiHref, { cache: "no-store" });
      if (!res.ok) {
        toast.error("No pudimos cargar la publicación.");
        setEditing(null);
        return;
      }
      const data = await res.json();
      // Ayudantia GET devuelve { ayudantia, stats } — el resto devuelve el
      // recurso al ras.
      const record = pub.kind === "ayudantia" ? data.ayudantia : data;
      setEditingData(record);
    } catch {
      toast.error("Error de red al cargar la publicación.");
      setEditing(null);
    } finally {
      setLoadingEdit(false);
    }
  }

  function closeEditor() {
    setEditing(null);
    setEditingData(null);
  }

  const counts = useMemo(() => {
    return {
      total: publications.length,
      ayudantia: publications.filter((p) => p.kind === "ayudantia").length,
      pasantia: publications.filter((p) => p.kind === "pasantia").length,
      oferta: publications.filter((p) => p.kind === "oferta").length,
      activas: publications.filter((p) => p.isActive).length,
      ocultas: publications.filter((p) => !p.isActive).length,
    };
  }, [publications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publications.filter((p) => {
      if (removed.has(p.id)) return false;
      if (filterKind !== "TODAS" && p.kind !== filterKind) return false;
      if (filterEstado === "ACTIVAS" && !p.isActive) return false;
      if (filterEstado === "OCULTAS" && p.isActive) return false;
      if (q) {
        const hay =
          `${p.title} ${p.eyebrow} ${p.meta} ${KIND_LABELS[p.kind]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publications, filterKind, filterEstado, query, removed]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      {/* Migaja */}
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link href="/dashboard/sala" className="hover:text-gz-gold transition-colors">
          ← La Sala
        </Link>
        <nav className="flex items-center gap-5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase">
          <Link
            href="/dashboard/sala/ayudantias"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Ayudantías
          </Link>
          <Link
            href="/dashboard/sala/pasantias"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Pasantías
          </Link>
          <Link
            href="/dashboard/sala/ofertas"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Ofertas
          </Link>
        </nav>
      </div>

      {/* Masthead editorial */}
      <header className="max-w-[1100px] mx-auto mt-3.5 px-7 pb-5 border-b border-gz-ink">
        <div className="flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
          <span>Studio Iuris · Sala</span>
          <span>Tus publicaciones</span>
        </div>
        <div className="mt-3 flex items-end justify-between flex-wrap gap-4">
          <h1 className="font-cormorant font-semibold text-[52px] leading-[1.02] tracking-[-1.5px] text-gz-ink m-0">
            <span className="text-gz-gold italic font-medium mr-2">¶</span>
            Mis publicaciones
          </h1>
          <p className="font-cormorant italic text-[18px] text-gz-ink-mid m-0 max-w-md">
            Todo lo que has publicado en La Sala —
            <span className="text-gz-ink"> {counts.total} en total</span>,
            {" "}{counts.activas} activa{counts.activas === 1 ? "" : "s"}.
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-[1100px] mx-auto px-7 pt-6">
        {/* Search + estado */}
        <div className="flex items-stretch gap-3 max-w-3xl mx-auto">
          <div className="flex-1 flex items-stretch bg-white border border-gz-rule rounded-[4px] overflow-hidden shadow-sm">
            <div className="flex-1 flex flex-col justify-center px-5 py-3">
              <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
                Buscar entre tus publicaciones
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ej. obligaciones, junior, pasantía verano…"
                className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none placeholder:text-gz-ink-light/60 py-0.5"
              />
            </div>
          </div>
        </div>

        {/* Tabs por kind */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex gap-0 border-y border-gz-rule min-w-max">
            <KindTab
              active={filterKind === "TODAS"}
              onClick={() => setFilterKind("TODAS")}
              glyph="∗"
              label="Todas"
              count={counts.total}
            />
            <KindTab
              active={filterKind === "ayudantia"}
              onClick={() => setFilterKind("ayudantia")}
              glyph="§"
              label="Ayudantías"
              count={counts.ayudantia}
            />
            <KindTab
              active={filterKind === "pasantia"}
              onClick={() => setFilterKind("pasantia")}
              glyph="¶"
              label="Pasantías"
              count={counts.pasantia}
            />
            <KindTab
              active={filterKind === "oferta"}
              onClick={() => setFilterKind("oferta")}
              glyph="⚖"
              label="Ofertas"
              count={counts.oferta}
            />
          </div>
        </div>

        {/* Filtro de estado */}
        <div className="flex justify-between items-center gap-3 py-4 border-b border-gz-rule flex-wrap">
          <div className="flex gap-2">
            {(["ACTIVAS", "OCULTAS", "TODAS"] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setFilterEstado(e)}
                className={`px-3.5 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition
                           ${filterEstado === e
                             ? "bg-gz-ink text-gz-cream border-gz-ink"
                             : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"}`}
              >
                {e === "ACTIVAS"
                  ? `Activas (${counts.activas})`
                  : e === "OCULTAS"
                    ? `Ocultas (${counts.ocultas})`
                    : `Todas (${counts.total})`}
              </button>
            ))}
          </div>
          <span className="font-cormorant italic text-[14px] text-gz-ink-mid">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Lista */}
      <main className="max-w-[1100px] mx-auto px-7 py-8">
        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <div className="border-t border-gz-rule bg-white">
            {filtered.map((pub) => (
              <PublicacionRow
                key={`${pub.kind}-${pub.id}`}
                pub={pub}
                onDeleted={(id) => {
                  setRemoved((prev) => new Set(prev).add(id));
                }}
                onEdit={openEditor}
              />
            ))}
          </div>
        )}
      </main>

      {/* Editor inline V4 — un PublishSheet con el form correspondiente
          según el kind de la publicación. */}
      <PublishSheet
        open={Boolean(editing)}
        onClose={closeEditor}
        eyebrow={editing ? sheetEyebrow(editing.kind) : "La Sala"}
        title={editing ? sheetTitle(editing) : "Editar publicación"}
        subtitle="Edita los detalles y guarda los cambios."
      >
        {loadingEdit || !editingData ? (
          <div className="px-6 py-12 text-center font-cormorant italic text-[18px] text-gz-ink-mid">
            Cargando…
          </div>
        ) : editing?.kind === "oferta" ? (
          <OfertaForm
            editingId={editing.id}
            initialValues={mapOfertaInitial(editingData)}
            onCancel={closeEditor}
            onSuccess={closeEditor}
          />
        ) : editing?.kind === "pasantia" ? (
          <PasantiaForm
            editingId={editing.id}
            initialValues={mapPasantiaInitial(editingData)}
            onCancel={closeEditor}
            onSuccess={closeEditor}
          />
        ) : editing?.kind === "ayudantia" ? (
          <AyudantiaForm
            editingId={editing.id}
            initialValues={mapAyudantiaInitial(editingData)}
            onCancel={closeEditor}
            onSuccess={closeEditor}
          />
        ) : null}
      </PublishSheet>
    </div>
  );
}

// ─── Helpers de mapeo ─────────────────────────────────────────────────────

function sheetEyebrow(kind: PublicationKind): string {
  if (kind === "oferta") return "La Sala · Ofertas laborales";
  if (kind === "pasantia") return "La Sala · Pasantías";
  return "La Sala · Ayudantías";
}

function sheetTitle(pub: Publication): string {
  if (pub.kind === "oferta") return "Editar oferta";
  if (pub.kind === "pasantia") return "Editar pasantía";
  return "Editar ayudantía";
}

type AnyRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function pickNumber(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function mapOfertaInitial(r: AnyRecord) {
  return {
    empresa: pickString(r.empresa),
    cargo: pickString(r.cargo),
    areaPractica: pickString(r.areaPractica),
    ciudad: pickString(r.ciudad),
    formato: pickString(r.formato),
    tipoContrato: pickString(r.tipoContrato),
    experienciaReq: pickString(r.experienciaReq) ?? null,
    remuneracion: pickString(r.remuneracion) ?? null,
    descripcion: pickString(r.descripcion),
    requisitos: pickString(r.requisitos) ?? null,
    metodoPostulacion: pickString(r.metodoPostulacion),
    contactoPostulacion: pickString(r.contactoPostulacion) ?? null,
  };
}

function mapPasantiaInitial(r: AnyRecord) {
  const type = r.type === "busco" ? "busco" : "ofrezco";
  const postulacionTipo =
    r.postulacionTipo === "EXTERNA" ? "EXTERNA" : "INTERNA";
  return {
    type,
    empresa: pickString(r.empresa),
    titulo: pickString(r.titulo),
    descripcion: pickString(r.descripcion),
    areaPractica: pickString(r.areaPractica),
    ciudad: pickString(r.ciudad),
    formato: pickString(r.formato),
    jornada: pickString(r.jornada) ?? null,
    duracion: pickString(r.duracion) ?? null,
    remuneracion: pickString(r.remuneracion),
    montoRemu: pickString(r.montoRemu) ?? null,
    fechaInicio: pickString(r.fechaInicio) ?? null,
    fechaLimite: pickString(r.fechaLimite) ?? null,
    cupos: pickNumber(r.cupos) ?? null,
    requisitos: pickString(r.requisitos) ?? null,
    postulacionTipo,
    postulacionUrl: pickString(r.postulacionUrl) ?? null,
    contactoEmail: pickString(r.contactoEmail) ?? null,
    contactoWhatsapp: pickString(r.contactoWhatsapp) ?? null,
  } as const;
}

function mapAyudantiaInitial(r: AnyRecord) {
  const type = r.type === "BUSCO" ? "BUSCO" : "OFREZCO";
  const orientadaA = Array.isArray(r.orientadaA)
    ? (r.orientadaA as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : [];
  return {
    type,
    titulo: pickString(r.titulo) ?? null,
    materia: pickString(r.materia),
    universidad: pickString(r.universidad),
    format: pickString(r.format),
    priceType: pickString(r.priceType),
    priceAmount: pickNumber(r.priceAmount) ?? null,
    description: pickString(r.description),
    disponibilidad: pickString(r.disponibilidad) ?? null,
    contactMethod: pickString(r.contactMethod),
    contactValue: pickString(r.contactValue),
    orientadaA,
  } as const;
}

function KindTab({
  active,
  onClick,
  glyph,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  glyph: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-r border-gz-rule last:border-r-0
                 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase transition whitespace-nowrap cursor-pointer
                 ${active
                   ? "bg-gz-ink text-gz-cream"
                   : "text-gz-ink-mid hover:bg-gz-cream hover:text-gz-ink"}`}
    >
      <span
        className={`font-cormorant text-[16px] italic ${active ? "text-gz-gold-bright" : "text-gz-gold"}`}
      >
        {glyph}
      </span>
      {label}
      <span
        className={`font-archivo text-[10px] ${active ? "text-gz-cream/70" : "text-gz-ink-light"}`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-24 text-center border border-gz-rule bg-white">
      <p className="font-cormorant italic text-[22px] text-gz-ink-mid">
        {query
          ? "No hay publicaciones que coincidan con tu búsqueda."
          : "Aún no has publicado nada en La Sala."}
      </p>
      <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
        {query ? (
          "Prueba con otro término o cambia el filtro."
        ) : (
          <>
            Empieza por publicar una ayudantía, una pasantía o una oferta laboral
            desde el listado correspondiente.
          </>
        )}
      </p>
    </div>
  );
}
