"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

interface Anunciante {
  id: string;
  nombre: string;
  tipo: string;
}

interface SlideData {
  id?: string;
  origen: string;
  tipo: string;
  imagenUrl: string;
  imagenPosicion: string;
  overlayOpacidad: number;
  titulo: string;
  subtitulo: string;
  ctaTexto: string;
  ctaUrl: string;
  ctaExterno: boolean;
  anuncianteId: string;
  precioPactado: string;
  tipoCobro: string;
  ubicaciones: string[];
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  sinFechaFin: boolean;
  orden: string;
}

const TIPOS_EDITORIAL = [
  { value: "diario_post", label: "Post del Diario" },
  { value: "contingencia", label: "Contingencia" },
  { value: "anuncio_plataforma", label: "Anuncio de plataforma" },
  { value: "expediente", label: "Expediente" },
];

const TIPOS_PUBLICITARIO = [
  { value: "estudio_juridico", label: "Estudio jurídico" },
  { value: "editorial_libro", label: "Editorial / Libro" },
  { value: "evento_concurso", label: "Evento / Concurso" },
  { value: "academia", label: "Academia" },
  { value: "servicio_profesional", label: "Servicio profesional" },
];

const POSICIONES = [
  { value: "center", label: "Centro" },
  { value: "top", label: "Arriba" },
  { value: "bottom", label: "Abajo" },
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
];

interface Props {
  initialData?: SlideData;
  isEdit?: boolean;
}

export function HeroSlideForm({ initialData, isEdit }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(260);

  // Anunciantes
  const [anunciantes, setAnunciantes] = useState<Anunciante[]>([]);
  const [showNewAnunciante, setShowNewAnunciante] = useState(false);
  const [nuevoAnunciante, setNuevoAnunciante] = useState({ nombre: "", tipo: "empresa", contactoEmail: "" });

  // Form state
  const [form, setForm] = useState<SlideData>(
    initialData || {
      origen: "editorial",
      tipo: "anuncio_plataforma",
      imagenUrl: "",
      imagenPosicion: "center",
      overlayOpacidad: 0.45,
      titulo: "",
      subtitulo: "",
      ctaTexto: "Ver más",
      ctaUrl: "",
      ctaExterno: false,
      anuncianteId: "",
      precioPactado: "",
      tipoCobro: "",
      ubicaciones: ["dashboard"],
      estado: "borrador",
      fechaInicio: new Date().toISOString().slice(0, 16),
      fechaFin: "",
      sinFechaFin: true,
      orden: "0",
    }
  );

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch anunciantes
  useEffect(() => {
    fetch("/api/admin/anunciantes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAnunciantes(data);
      })
      .catch(() => {});
  }, []);

  // Upload image
  const handleImageUpload = async (file: File) => {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Máx 3MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const uuid = crypto.randomUUID();
      const path = `${uuid}.${ext}`;

      const formData = new FormData();
      formData.append("file", file);

      // Upload via Supabase Storage directly
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const res = await fetch(
        `${supabaseUrl}/storage/v1/object/hero-slides/${path}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "x-upsert": "true",
          },
          body: file,
        }
      );

      if (!res.ok) throw new Error("Error al subir imagen");

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/hero-slides/${path}`;
      updateField("imagenUrl", publicUrl);
      toast.success("Imagen subida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  // Create anunciante
  const crearAnunciante = async () => {
    if (!nuevoAnunciante.nombre || !nuevoAnunciante.contactoEmail) {
      toast.error("Nombre y email requeridos");
      return;
    }
    try {
      const res = await fetch("/api/admin/anunciantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoAnunciante),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnunciantes((prev) => [...prev, data]);
      updateField("anuncianteId", data.id);
      setShowNewAnunciante(false);
      setNuevoAnunciante({ nombre: "", tipo: "empresa", contactoEmail: "" });
      toast.success("Anunciante creado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  // Save
  const handleSave = async (estadoOverride?: string) => {
    if (!form.titulo) { toast.error("Título requerido"); return; }
    if (!form.imagenUrl) { toast.error("Imagen requerida"); return; }
    if (!form.ctaUrl) { toast.error("URL destino requerida"); return; }
    if (form.ubicaciones.length === 0) { toast.error("Al menos una ubicación"); return; }

    setSaving(true);
    try {
      const body = {
        ...form,
        estado: estadoOverride || form.estado,
        overlayOpacidad: Number(form.overlayOpacidad),
        orden: Number(form.orden),
        precioPactado: form.precioPactado ? Number(form.precioPactado) : null,
        subtitulo: form.subtitulo || null,
        anuncianteId: form.origen === "publicitario" ? form.anuncianteId : null,
        tipoCobro: form.origen === "publicitario" ? form.tipoCobro : null,
        fechaFin: form.sinFechaFin ? null : form.fechaFin || null,
      };

      const url = isEdit
        ? `/api/admin/hero-slides/${initialData?.id}`
        : "/api/admin/hero-slides";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(isEdit ? "Slide actualizado" : "Slide creado");
      router.push("/admin/hero-slides");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const tiposDisponibles = form.origen === "publicitario" ? TIPOS_PUBLICITARIO : TIPOS_EDITORIAL;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">
          {isEdit ? "Editar Slide" : "Nuevo Slide"}
        </h1>
        <button
          onClick={() => router.push("/admin/hero-slides")}
          className="text-sm text-navy/50 hover:text-navy"
        >
          ← Volver
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT — Form */}
        <div className="space-y-6">
          {/* Origen */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy uppercase tracking-wider">Origen</h3>
            <div className="flex gap-2">
              {["editorial", "publicitario"].map((o) => (
                <button
                  key={o}
                  onClick={() => updateField("origen", o)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    form.origen === o
                      ? "bg-navy text-white"
                      : "bg-navy/5 text-navy/60 hover:bg-navy/10"
                  }`}
                >
                  {o === "editorial" ? "Editorial" : "Publicitario"}
                </button>
              ))}
            </div>

            {form.origen === "publicitario" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy/60">Anunciante</label>
                  <select
                    value={form.anuncianteId}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setShowNewAnunciante(true);
                      } else {
                        updateField("anuncianteId", e.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy"
                  >
                    <option value="">Seleccionar...</option>
                    {anunciantes.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                    <option value="__new__">＋ Crear nuevo anunciante</option>
                  </select>
                </div>

                {showNewAnunciante && (
                  <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-2">
                    <input
                      placeholder="Nombre del anunciante"
                      value={nuevoAnunciante.nombre}
                      onChange={(e) => setNuevoAnunciante((p) => ({ ...p, nombre: e.target.value }))}
                      className="w-full rounded border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Tipo (empresa, persona, etc)"
                      value={nuevoAnunciante.tipo}
                      onChange={(e) => setNuevoAnunciante((p) => ({ ...p, tipo: e.target.value }))}
                      className="w-full rounded border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Email de contacto"
                      type="email"
                      value={nuevoAnunciante.contactoEmail}
                      onChange={(e) => setNuevoAnunciante((p) => ({ ...p, contactoEmail: e.target.value }))}
                      className="w-full rounded border border-border px-2 py-1.5 text-sm"
                    />
                    <div className="flex gap-2">
                      <button onClick={crearAnunciante} className="rounded bg-gold px-3 py-1 text-xs font-semibold text-white">Crear</button>
                      <button onClick={() => setShowNewAnunciante(false)} className="text-xs text-navy/50">Cancelar</button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-navy/60">Precio CLP</label>
                    <input
                      type="number"
                      value={form.precioPactado}
                      onChange={(e) => updateField("precioPactado", e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-navy/60">Tipo cobro</label>
                    <select
                      value={form.tipoCobro}
                      onChange={(e) => updateField("tipoCobro", e.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensual">Mensual</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60">Tipo de contenido</label>
              <select
                value={form.tipo}
                onChange={(e) => updateField("tipo", e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy"
              >
                {tiposDisponibles.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Imagen */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy uppercase tracking-wider">Imagen</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const f = e.dataTransfer.files[0];
                if (f) handleImageUpload(f);
              }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gold/40 p-6 text-center hover:border-gold transition-colors"
            >
              {uploading ? (
                <span className="animate-spin text-xl">⏳</span>
              ) : form.imagenUrl ? (
                <img src={form.imagenUrl} alt="Preview" className="h-16 w-28 rounded object-cover" />
              ) : (
                <span className="text-2xl">📤</span>
              )}
              <span className="text-xs text-navy/50">1600×600px · JPG o WebP · máx 3MB</span>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-navy/60">Posición</label>
                <div className="flex gap-1">
                  {POSICIONES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => updateField("imagenPosicion", p.value)}
                      className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
                        form.imagenPosicion === p.value
                          ? "bg-navy text-white"
                          : "bg-navy/5 text-navy/60 hover:bg-navy/10"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60">
                Oscuridad: {Math.round(Number(form.overlayOpacidad) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={form.overlayOpacidad}
                onChange={(e) => updateField("overlayOpacidad", parseFloat(e.target.value))}
                className="w-full accent-gold"
              />
            </div>
          </section>

          {/* Textos */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy uppercase tracking-wider">Textos</h3>
            <div>
              <label className="mb-1 flex justify-between text-xs font-medium text-navy/60">
                <span>Título</span>
                <span>{form.titulo.length}/80</span>
              </label>
              <input
                value={form.titulo}
                onChange={(e) => updateField("titulo", e.target.value.slice(0, 80))}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
                placeholder="Título del slide"
              />
            </div>
            <div>
              <label className="mb-1 flex justify-between text-xs font-medium text-navy/60">
                <span>Subtítulo</span>
                <span>{form.subtitulo.length}/200</span>
              </label>
              <textarea
                value={form.subtitulo}
                onChange={(e) => updateField("subtitulo", e.target.value.slice(0, 200))}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy resize-none"
                rows={2}
                placeholder="Subtítulo opcional"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-navy/60">Texto botón</label>
                <input
                  value={form.ctaTexto}
                  onChange={(e) => updateField("ctaTexto", e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-navy/60">URL destino</label>
                <input
                  value={form.ctaUrl}
                  onChange={(e) => updateField("ctaUrl", e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-navy/70">
              <input
                type="checkbox"
                checked={form.ctaExterno}
                onChange={(e) => updateField("ctaExterno", e.target.checked)}
                className="accent-gold"
              />
              Abrir en nueva pestaña
            </label>
          </section>

          {/* Publicación */}
          <section className="rounded-xl border border-border bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-navy uppercase tracking-wider">Publicación</h3>
            <div className="flex gap-4">
              {["dashboard", "diario"].map((ub) => (
                <label key={ub} className="flex items-center gap-2 text-sm text-navy/70">
                  <input
                    type="checkbox"
                    checked={form.ubicaciones.includes(ub)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...form.ubicaciones, ub]
                        : form.ubicaciones.filter((u) => u !== ub);
                      updateField("ubicaciones", next);
                    }}
                    className="accent-gold"
                  />
                  {ub === "dashboard" ? "Dashboard" : "El Diario"}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-navy/60">Fecha inicio</label>
                <input
                  type="datetime-local"
                  value={form.fechaInicio}
                  onChange={(e) => updateField("fechaInicio", e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 mb-1 text-xs font-medium text-navy/60">
                  <input
                    type="checkbox"
                    checked={form.sinFechaFin}
                    onChange={(e) => updateField("sinFechaFin", e.target.checked)}
                    className="accent-gold"
                  />
                  Sin fecha de término
                </label>
                {!form.sinFechaFin && (
                  <input
                    type="datetime-local"
                    value={form.fechaFin}
                    onChange={(e) => updateField("fechaFin", e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-navy/60">
                Orden <span className="text-navy/40">(mayor = aparece primero)</span>
              </label>
              <input
                type="number"
                value={form.orden}
                onChange={(e) => updateField("orden", e.target.value)}
                className="w-32 rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>

            {isEdit && (
              <div>
                <label className="mb-1 block text-xs font-medium text-navy/60">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => updateField("estado", e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  <option value="borrador">Borrador</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>
            )}
          </section>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSave("borrador")}
              disabled={saving}
              className="flex-1 rounded-lg border-2 border-navy bg-white py-3 font-semibold text-navy hover:bg-navy/5 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar borrador"}
            </button>
            <button
              onClick={() => handleSave("activo")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gold py-3 font-semibold text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Aprobar y activar"}
            </button>
          </div>
        </div>

        {/* RIGHT — Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy uppercase tracking-wider">Vista previa</h3>
            <button
              onClick={() => setPreviewHeight((h) => (h === 260 ? 420 : 260))}
              className="rounded bg-navy/5 px-2 py-1 text-xs text-navy/60 hover:bg-navy/10"
            >
              {previewHeight === 260 ? "📱 → 🖥️" : "🖥️ → 📱"}
            </button>
          </div>
          <div
            className="relative w-full overflow-hidden rounded-xl"
            style={{ height: `${previewHeight}px` }}
          >
            {form.imagenUrl ? (
              <>
                <Image
                  src={form.imagenUrl}
                  alt="Preview"
                  fill
                  sizes="100vw"
                  className="object-cover"
                  style={{ objectPosition: form.imagenPosicion }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(0,0,0,${form.overlayOpacidad}), rgba(0,0,0,0.1))`,
                  }}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-[#12203A]">
                <span className="text-white/60 text-sm">Vista previa</span>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
              <h2 className="font-serif text-white text-xl font-bold line-clamp-2">
                {form.titulo || "Título del slide"}
              </h2>
              {form.subtitulo && (
                <p className="text-white/80 text-sm mt-2 line-clamp-2 max-w-lg">
                  {form.subtitulo}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex bg-[#9A7230] text-white rounded-sm px-5 py-2.5 text-sm font-semibold">
                  {form.ctaTexto || "Ver más"}
                </span>
                {form.origen === "publicitario" && (
                  <span className="bg-[#9A7230]/80 text-white text-[10px] font-semibold px-2 py-1 rounded-sm tracking-wider uppercase">
                    Publicidad
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
