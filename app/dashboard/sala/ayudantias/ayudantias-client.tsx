"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MastheadV4 } from "@/components/ayudantias/masthead-v4";
import { FilterRow } from "@/components/ayudantias/filter-row";
import { TileCard, type TileCardProps } from "@/components/ayudantias/tile-card";
import { PublishSheet } from "@/components/sala/publish-sheet";
import { AyudantiaForm } from "@/components/ayudantias/ayudantia-form";

type Ayudantia = Omit<TileCardProps, "onFav" | "initialFav">;

export function AyudantiasV4Client({
  ayudantias,
}: {
  ayudantias: Ayudantia[];
}) {
  const [query, setQuery] = useState("");
  const [materia, setMateria] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"TODAS" | "OFREZCO" | "BUSCO">("TODAS");
  const [sort, setSort] = useState<"recientes" | "rating" | "precio">("recientes");
  const [publishOpen, setPublishOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = ayudantias.filter((a) => {
      if (materia && a.materia !== materia) return false;
      if (tipo !== "TODAS" && a.type !== tipo) return false;
      if (q) {
        const hay = `${a.titulo ?? ""} ${a.materia} ${a.user.firstName} ${a.user.lastName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === "rating") {
      list = [...list].sort((a, b) => (b.rating?.avg ?? 0) - (a.rating?.avg ?? 0));
    } else if (sort === "precio") {
      list = [...list].sort((a, b) => {
        const pa = a.priceType === "GRATUITO" ? 0 : a.priceAmount ?? Infinity;
        const pb = b.priceType === "GRATUITO" ? 0 : b.priceAmount ?? Infinity;
        return pa - pb;
      });
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [ayudantias, query, materia, tipo, sort]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link href="/dashboard/sala" className="hover:text-gz-gold transition-colors">
          ← La Sala
        </Link>
        <nav className="flex items-center gap-5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase">
          <Link
            href="/dashboard/sala/ayudantias/gestion"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Mis publicaciones
          </Link>
          <Link
            href="/dashboard/sala/ayudantias/gestion?tab=sesiones"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Mis sesiones
          </Link>
        </nav>
      </div>

      <MastheadV4 resultCount={filtered.length} />

      <FilterRow
        query={query}
        onQueryChange={setQuery}
        selectedMateria={materia}
        onMateriaChange={setMateria}
        tipoFiltro={tipo}
        onTipoChange={setTipo}
        sort={sort}
        onSortChange={setSort}
        onPublish={() => setPublishOpen(true)}
      />

      <main className="max-w-[1400px] mx-auto px-7 py-8">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            className="grid gap-0 border-t border-l border-gz-rule bg-white"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {filtered.map((a) => (
              <TileCard key={a.id} {...a} />
            ))}
          </div>
        )}
      </main>

      <PublishSheet
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        eyebrow="La Sala · Ayudantías"
        title="Publicar ayudantía"
        subtitle="Ofrece tu ayudantía o publica que estás buscando un tutor."
      >
        <AyudantiaForm
          onCancel={() => setPublishOpen(false)}
          onSuccess={() => setPublishOpen(false)}
        />
      </PublishSheet>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 text-center border border-gz-rule bg-white">
      <p className="font-cormorant italic text-[22px] text-gz-ink-mid">
        No hay publicaciones que coincidan con tu búsqueda.
      </p>
      <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
        Prueba cambiando la materia o el tipo de filtro.
      </p>
    </div>
  );
}
