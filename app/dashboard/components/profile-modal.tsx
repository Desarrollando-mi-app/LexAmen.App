"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BADGE_RULES } from "@/lib/badge-constants";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";
import { UNIVERSIDADES_CHILE } from "@/lib/ayudantia-constants";

// ─── Types ───────────────────────────────────────────────

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  institution: string | null;
  universityYear: number | null;
  cvAvailable: boolean;
  xp: number;
  causasGanadas: number;
  tier: string | null;
  flashcardsMastered: number;
  badgeCount: number;
  earnedBadges: string[];
}

interface ProfileModalProps {
  profile: ProfileData;
  onClose: () => void;
  onProfileUpdate: (updates: Partial<ProfileData>) => void;
}

// ─── Settings tabs ───────────────────────────────────────

type SettingsTab = "perfil" | "seguridad" | "datos" | "preferencias";

const SETTINGS_TABS: { key: SettingsTab; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "seguridad", label: "Seguridad" },
  { key: "datos", label: "Mis Datos" },
  { key: "preferencias", label: "Preferencias" },
];

// ─── Component ───────────────────────────────────────────

export function ProfileModal({
  profile: initialProfile,
  onClose,
  onProfileUpdate,
}: ProfileModalProps) {
  const [view, setView] = useState<"profile" | "settings">("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("perfil");
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  const tierLabel = profile.tier
    ? TIER_LABELS[profile.tier] ?? profile.tier
    : null;
  const tierEmoji = profile.tier ? TIER_EMOJIS[profile.tier] ?? "" : "";

  // ─── Avatar upload ────────────────────────────────────

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    // Optimistic preview
    const previewUrl = URL.createObjectURL(file);
    setProfile((p) => ({ ...p, avatarUrl: previewUrl }));

    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al subir avatar");
        setProfile((p) => ({ ...p, avatarUrl: initialProfile.avatarUrl }));
        return;
      }
      setProfile((p) => ({ ...p, avatarUrl: data.avatarUrl }));
      onProfileUpdate({ avatarUrl: data.avatarUrl });
      toast.success("Avatar actualizado");
    } catch {
      toast.error("Error de conexión");
      setProfile((p) => ({ ...p, avatarUrl: initialProfile.avatarUrl }));
    }
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        onClick={(e) => e.target === overlayRef.current && onClose()}
      >
        {/* Modal */}
        <div className="relative w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-navy/40 hover:bg-navy/5 hover:text-navy transition-colors"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="M6 6 18 18" />
            </svg>
          </button>

          {view === "profile" ? (
            <ProfileView
              profile={profile}
              initials={initials}
              tierLabel={tierLabel}
              tierEmoji={tierEmoji}
              fileInputRef={fileInputRef}
              onAvatarUpload={handleAvatarUpload}
              onEditClick={() => setView("settings")}
            />
          ) : (
            <SettingsView
              profile={profile}
              settingsTab={settingsTab}
              setSettingsTab={setSettingsTab}
              onBack={() => setView("profile")}
              onProfileUpdate={(updates) => {
                setProfile((p) => ({ ...p, ...updates }));
                onProfileUpdate(updates);
              }}
            />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarUpload}
      />
    </>
  );
}

// ─── Profile View ───────────────────────────────────────

function ProfileView({
  profile,
  initials,
  tierLabel,
  tierEmoji,
  fileInputRef,
  onAvatarUpload,
  onEditClick,
}: {
  profile: ProfileData;
  initials: string;
  tierLabel: string | null;
  tierEmoji: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditClick: () => void;
}) {
  void onAvatarUpload; // used via fileInputRef

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        {/* Avatar with camera button */}
        <div className="relative shrink-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.firstName} ${profile.lastName}`}
              className="h-20 w-20 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-bold text-white">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-white shadow-md hover:bg-gold/90 transition-colors"
            title="Cambiar foto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold text-navy font-display truncate">
            {profile.firstName} {profile.lastName}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-navy/60">
            {profile.institution && <span>{profile.institution}</span>}
            {profile.universityYear && (
              <span>
                {profile.institution ? "·" : ""} {profile.universityYear}° año
              </span>
            )}
          </div>
          {tierLabel && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
              {tierEmoji} {tierLabel}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        {[
          { value: profile.xp.toLocaleString(), label: "XP Total" },
          { value: String(profile.flashcardsMastered), label: "Dominadas" },
          { value: String(profile.causasGanadas), label: "Causas ganadas" },
          { value: String(profile.badgeCount), label: "Insignias" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-paper p-3 text-center">
            <p className="text-lg font-bold text-navy font-display">{s.value}</p>
            <p className="text-[11px] text-navy/50">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="mt-5">
        <p className="text-sm text-navy/70 leading-relaxed">
          {profile.bio || (
            <span className="italic text-navy/30">Agrega una descripción sobre ti</span>
          )}
        </p>
      </div>

      {/* Badges */}
      {profile.earnedBadges.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/50">
            Insignias ganadas
          </h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {BADGE_RULES.filter((b) => profile.earnedBadges.includes(b.slug)).map((badge) => (
              <div
                key={badge.slug}
                className="flex items-center gap-1.5 rounded-full bg-gold/5 px-3 py-1.5 border border-gold/15"
                title={badge.description}
              >
                <span className="text-lg">{badge.emoji}</span>
                <span className="text-xs font-medium text-navy">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onEditClick}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          Editar perfil
        </button>
        <Link
          href={`/dashboard/perfil/${profile.id}`}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-navy/70 transition-colors hover:bg-paper"
          onClick={(e) => e.stopPropagation()}
        >
          Ver mi perfil público
        </Link>
      </div>
    </div>
  );
}

// ─── Settings View ──────────────────────────────────────

function SettingsView({
  profile,
  settingsTab,
  setSettingsTab,
  onBack,
  onProfileUpdate,
}: {
  profile: ProfileData;
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
  onBack: () => void;
  onProfileUpdate: (updates: Partial<ProfileData>) => void;
}) {
  return (
    <div className="p-6 sm:p-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-navy/60 hover:text-navy transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
        Volver al perfil
      </button>

      <h2 className="text-lg font-bold text-navy font-display">Configuración</h2>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-lg bg-paper p-1">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSettingsTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              settingsTab === tab.key
                ? "bg-white text-navy shadow-sm"
                : "text-navy/50 hover:text-navy/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {settingsTab === "perfil" && (
          <TabPerfil profile={profile} onUpdate={onProfileUpdate} />
        )}
        {settingsTab === "seguridad" && <TabSeguridad />}
        {settingsTab === "datos" && <TabDatos />}
        {settingsTab === "preferencias" && <TabPreferencias />}
      </div>
    </div>
  );
}

// ─── Tab: Perfil ────────────────────────────────────────

function TabPerfil({
  profile,
  onUpdate,
}: {
  profile: ProfileData;
  onUpdate: (updates: Partial<ProfileData>) => void;
}) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [institution, setInstitution] = useState(profile.institution ?? "");
  const [universityYear, setUniversityYear] = useState(profile.universityYear ?? 1);
  const [cvAvailable, setCvAvailable] = useState(profile.cvAvailable);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          bio: bio || null,
          institution: institution || null,
          universityYear,
          cvAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }
      onUpdate({
        firstName,
        lastName,
        bio: bio || null,
        institution: institution || null,
        universityYear,
        cvAvailable,
      });
      toast.success("Perfil actualizado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-navy/60">Nombre</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-navy/60">Apellido</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-navy/60">Universidad</label>
        <select
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
        >
          <option value="">Selecciona una universidad</option>
          {UNIVERSIDADES_CHILE.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-navy/60">Año de carrera</label>
        <select
          value={universityYear}
          onChange={(e) => setUniversityYear(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((y) => (
            <option key={y} value={y}>{y}° año</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-navy/60">
          Bio <span className="font-normal text-navy/40">({bio.length}/280)</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Cuéntanos sobre ti..."
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy resize-none focus:border-gold/50 focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-navy">Acepto solicitudes de CV</p>
          <p className="text-xs text-navy/50">Otros usuarios podrán solicitarte tu CV</p>
        </div>
        <button
          onClick={() => setCvAvailable(!cvAvailable)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            cvAvailable ? "bg-gold" : "bg-navy/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              cvAvailable ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

// ─── Tab: Seguridad ─────────────────────────────────────

function TabSeguridad() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al cambiar contraseña");
        return;
      }
      toast.success("Contraseña actualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-navy/60">Contraseña actual</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-navy/60">Nueva contraseña</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-navy/60">Confirmar contraseña</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
        />
      </div>
      <button
        onClick={handleChangePassword}
        disabled={saving || !currentPassword || !newPassword}
        className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
      >
        {saving ? "Cambiando..." : "Cambiar contraseña"}
      </button>
    </div>
  );
}

// ─── Tab: Mis Datos (ARCO) ──────────────────────────────

function TabDatos() {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) {
        toast.error("Error al exportar datos");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mis-datos-iuris-studio.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Datos descargados");
    } catch {
      toast.error("Error de conexión");
    }
  }

  async function handleDelete() {
    if (confirmation !== "ELIMINAR MI CUENTA") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Error al eliminar cuenta");
        return;
      }
      toast.success("Cuenta eliminada");
      window.location.href = "/";
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-navy">Tus derechos sobre tus datos</h3>
        <p className="mt-1 text-xs text-navy/50">
          Conforme a la ley, tienes derecho a acceder, rectificar, cancelar y
          oponerte al tratamiento de tus datos personales (ARCO).
        </p>
      </div>

      {/* Export */}
      <div className="rounded-lg border border-border p-4">
        <h4 className="text-sm font-semibold text-navy">Descargar mis datos</h4>
        <p className="mt-1 text-xs text-navy/50">
          Descarga una copia completa de toda tu información en formato JSON.
        </p>
        <button
          onClick={handleExport}
          className="mt-3 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-navy hover:bg-paper transition-colors"
        >
          📥 Descargar JSON
        </button>
      </div>

      {/* Delete */}
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
        <h4 className="text-sm font-semibold text-red-700">Eliminar mi cuenta</h4>
        <p className="mt-1 text-xs text-red-600/70">
          Esta acción es irreversible. Se eliminarán tu perfil, progreso, estadísticas
          y todos tus datos asociados.
        </p>
        <div className="mt-3">
          <label className="text-xs text-red-600/70">
            Escribe <strong>ELIMINAR MI CUENTA</strong> para confirmar
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="ELIMINAR MI CUENTA"
            className="mt-1 w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 focus:border-red-400 focus:outline-none"
          />
        </div>
        <button
          onClick={handleDelete}
          disabled={confirmation !== "ELIMINAR MI CUENTA" || deleting}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
        >
          {deleting ? "Eliminando..." : "Eliminar cuenta permanentemente"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Preferencias ──────────────────────────────────

function TabPreferencias() {
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <p className="text-sm font-medium text-navy">Tema visual</p>
          <p className="text-xs text-navy/50">
            {theme === "dark" ? "Arca Romana (noche)" : "Papel & Tinta (día)"}
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            theme === "dark" ? "bg-gold" : "bg-navy/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              theme === "dark" ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-navy/30 text-center">
        Más preferencias próximamente
      </p>
    </div>
  );
}
