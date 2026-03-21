"use client";

import { useState, useEffect, useCallback } from "react";

interface AppConfig {
  id: string;
  clave: string;
  valor: string;
  tipo: string;
  categoria: string;
  label: string;
  descripcion: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  limites: "Limites Plan Gratuito",
  xp: "Puntos de Experiencia (XP)",
  features: "Feature Toggles",
  expediente: "Expediente Abierto",
  peer_review: "Peer Review",
  diario: "El Diario",
};

export function ConfigClient() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      setConfigs(data.configs);
      setCategorias(data.categorias);
      const vals: Record<string, string> = {};
      for (const c of data.configs) {
        vals[c.clave] = c.valor;
      }
      setEditValues(vals);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  async function saveConfig(clave: string, valor: string) {
    setSaving(clave);
    try {
      await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave, valor }),
      });
      setSaved(clave);
      setTimeout(() => setSaved((prev) => (prev === clave ? null : prev)), 1500);
      // Update local state
      setConfigs((prev) =>
        prev.map((c) => (c.clave === clave ? { ...c, valor } : c))
      );
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  }

  async function handleAction(action: "seed" | "reset") {
    if (
      action === "reset" &&
      !confirm(
        "Esto restaurara todos los valores a los predeterminados. Continuar?"
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchConfigs();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  }

  function handleToggle(clave: string, currentValue: string) {
    const newVal = currentValue === "true" ? "false" : "true";
    setEditValues((prev) => ({ ...prev, [clave]: newVal }));
    saveConfig(clave, newVal);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  const grouped: Record<string, AppConfig[]> = {};
  for (const c of configs) {
    if (!grouped[c.categoria]) grouped[c.categoria] = [];
    grouped[c.categoria].push(c);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            Configuracion Global
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Ajustes de plataforma, limites y feature toggles
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("seed")}
            disabled={actionLoading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-navy/5 transition-colors disabled:opacity-50"
          >
            Seed defaults
          </button>
          <button
            onClick={() => handleAction("reset")}
            disabled={actionLoading}
            className="rounded-lg border border-gz-red/30 px-4 py-2 text-sm font-medium text-gz-red hover:bg-gz-red/5 transition-colors disabled:opacity-50"
          >
            Reset a valores por defecto
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
        <p className="text-sm font-medium text-navy">
          Los cambios se aplican inmediatamente.
        </p>
      </div>

      {/* Config sections by category */}
      {categorias.map((cat) => (
        <div key={cat} className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-bold text-navy mb-4">
            {CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <div className="space-y-4">
            {(grouped[cat] ?? []).map((config) => (
              <ConfigRow
                key={config.clave}
                config={config}
                editValue={editValues[config.clave] ?? config.valor}
                onEditChange={(val) =>
                  setEditValues((prev) => ({ ...prev, [config.clave]: val }))
                }
                onSave={(val) => saveConfig(config.clave, val)}
                onToggle={() => handleToggle(config.clave, editValues[config.clave] ?? config.valor)}
                isSaving={saving === config.clave}
                isSaved={saved === config.clave}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Individual Config Row ───────────────────────────────────────

interface ConfigRowProps {
  config: AppConfig;
  editValue: string;
  onEditChange: (val: string) => void;
  onSave: (val: string) => void;
  onToggle: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

function ConfigRow({
  config,
  editValue,
  onEditChange,
  onSave,
  onToggle,
  isSaving,
  isSaved,
}: ConfigRowProps) {
  const changed = editValue !== config.valor;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-gold/5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy">{config.label}</p>
        {config.descripcion && (
          <p className="text-xs text-navy/50 mt-0.5">{config.descripcion}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {config.tipo === "boolean" ? (
          <button
            onClick={onToggle}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              editValue === "true" ? "bg-gold" : "bg-navy/20"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                editValue === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        ) : config.tipo === "number" ? (
          <>
            <input
              type="number"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && changed) onSave(editValue);
              }}
              className="w-24 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-navy text-right focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
            {changed && (
              <button
                onClick={() => onSave(editValue)}
                disabled={isSaving}
                className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? "..." : "Guardar"}
              </button>
            )}
          </>
        ) : (
          <>
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && changed) onSave(editValue);
              }}
              className="w-48 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
            {changed && (
              <button
                onClick={() => onSave(editValue)}
                disabled={isSaving}
                className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? "..." : "Guardar"}
              </button>
            )}
          </>
        )}

        {/* Save feedback */}
        <span
          className={`text-sm transition-opacity duration-500 ${
            isSaved ? "opacity-100" : "opacity-0"
          }`}
        >
          {"✅"}
        </span>
      </div>
    </div>
  );
}
