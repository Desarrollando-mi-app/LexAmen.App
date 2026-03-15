"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  UNIVERSIDAD_NOMBRES,
  getSedesForUniversidad,
} from "@/lib/universidades";
import {
  validatePassword,
  PASSWORD_ERROR_MESSAGE,
} from "@/lib/password-validation";

// ─── Types ───────────────────────────────────────────────

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  universidad: string | null;
  sede: string | null;
  universityYear: number | null;
  cvAvailable: boolean;
}

interface PerfilSettingsProps {
  user: UserData;
}

// ─── Tabs ────────────────────────────────────────────────

type SettingsTab = "perfil" | "seguridad" | "datos" | "preferencias";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "seguridad", label: "Seguridad" },
  { key: "datos", label: "Mis Datos" },
  { key: "preferencias", label: "Preferencias" },
];

// ─── Shared styles ───────────────────────────────────────

const LABEL =
  "font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1.5 block";
const INPUT =
  "w-full border border-gz-rule rounded-[3px] px-3 py-2.5 font-archivo text-[14px] text-gz-ink bg-white focus:border-gz-gold focus:ring-1 focus:ring-gz-gold/20 focus:outline-none transition-colors placeholder:text-gz-ink-light/50";
const BTN_PRIMARY =
  "bg-gz-navy text-white font-archivo text-[13px] font-semibold px-6 py-2.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50";
const BTN_SECONDARY =
  "border border-gz-rule text-gz-ink-mid font-archivo text-[13px] font-semibold px-6 py-2.5 rounded-[3px] hover:border-gz-gold hover:text-gz-gold transition-colors";
const BTN_DESTRUCTIVE =
  "bg-gz-burgundy text-white font-archivo text-[13px] font-semibold px-6 py-2.5 rounded-[3px] hover:bg-gz-burgundy/90 transition-colors disabled:opacity-50";

// ─── Main Component ─────────────────────────────────────

export function PerfilSettings({ user: initialUser }: PerfilSettingsProps) {
  const [tab, setTab] = useState<SettingsTab>("perfil");
  const [user, setUser] = useState(initialUser);

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gz-rule mb-6 overflow-x-auto gz-scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`font-archivo text-[13px] font-semibold px-4 py-3 cursor-pointer transition-colors whitespace-nowrap ${
              tab === t.key
                ? "text-gz-ink border-b-2 border-gz-gold"
                : "text-gz-ink-light hover:text-gz-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-gz-slide-up">
        {tab === "perfil" && (
          <TabPerfil
            user={user}
            onUpdate={(updates) => setUser((u) => ({ ...u, ...updates }))}
          />
        )}
        {tab === "seguridad" && <TabSeguridad />}
        {tab === "datos" && <TabDatos onGoToProfile={() => setTab("perfil")} />}
        {tab === "preferencias" && <TabPreferencias />}
      </div>
    </div>
  );
}

// ─── Tab 1: Perfil ──────────────────────────────────────

function TabPerfil({
  user,
  onUpdate,
}: {
  user: UserData;
  onUpdate: (updates: Partial<UserData>) => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [universidad, setUniversidad] = useState(user.universidad ?? "");
  const [sede, setSede] = useState(user.sede ?? "");
  const [universityYear, setUniversityYear] = useState(
    user.universityYear ?? 1
  );
  const [cvAvailable, setCvAvailable] = useState(user.cvAvailable);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sedesDisponibles = universidad
    ? getSedesForUniversidad(universidad)
    : [];
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Nombre y apellido son obligatorios");
      return;
    }

    setSaving(true);
    try {
      // Upload avatar first if there's a new one
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const avatarRes = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        });
        const avatarData = await avatarRes.json();
        if (!avatarRes.ok) {
          toast.error(avatarData.error ?? "Error al subir avatar");
          setSaving(false);
          return;
        }
        newAvatarUrl = avatarData.avatarUrl;
        setAvatarUrl(newAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
      }

      // Update profile
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          bio: bio || null,
          universidad: universidad || null,
          sede: sede || null,
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio || null,
        avatarUrl: newAvatarUrl,
        universidad: universidad || null,
        sede: sede || null,
        universityYear,
        cvAvailable,
      });
      toast.success("Perfil actualizado");
    } catch {
      toast.error("Error de conexi\u00f3n");
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gz-gold cursor-pointer group shrink-0"
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={`${firstName} ${lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gz-navy text-gz-gold-bright text-2xl font-semibold flex items-center justify-center font-cormorant">
              {initials}
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </button>
        <div>
          <p className="font-archivo text-[14px] font-semibold text-gz-ink">
            Foto de perfil
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            JPG, PNG, WebP o HEIC. M&aacute;x 5 MB.
          </p>
          {avatarPreview && (
            <p className="font-ibm-mono text-[10px] text-gz-gold mt-1">
              Vista previa &mdash; guardar para aplicar
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={handleAvatarSelect}
        />
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Nombre</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Apellido</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {/* Email readonly */}
      <div>
        <label className={LABEL}>Correo electr&oacute;nico</label>
        <input
          type="email"
          value={user.email}
          readOnly
          className={`${INPUT} bg-gz-cream cursor-not-allowed opacity-70`}
        />
        <p className="font-archivo text-[11px] text-gz-ink-light mt-1">
          El email no se puede modificar directamente.
        </p>
      </div>

      {/* Universidad */}
      <div>
        <label className={LABEL}>Universidad</label>
        <select
          value={universidad}
          onChange={(e) => {
            setUniversidad(e.target.value);
            setSede("");
          }}
          className={INPUT}
        >
          <option value="">Selecciona una universidad</option>
          {UNIVERSIDAD_NOMBRES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Sede */}
      {sedesDisponibles.length > 0 && (
        <div>
          <label className={LABEL}>Sede</label>
          <select
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            className={INPUT}
          >
            <option value="">Selecciona una sede</option>
            {sedesDisponibles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Year */}
      <div>
        <label className={LABEL}>A&ntilde;o de carrera</label>
        <select
          value={universityYear}
          onChange={(e) => setUniversityYear(Number(e.target.value))}
          className={INPUT}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((y) => (
            <option key={y} value={y}>
              {y}&deg; a&ntilde;o
            </option>
          ))}
        </select>
      </div>

      {/* Bio */}
      <div>
        <label className={LABEL}>
          Bio{" "}
          <span className="normal-case tracking-normal font-archivo text-gz-ink-light/50">
            ({bio.length}/280)
          </span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Cu&eacute;ntanos sobre ti..."
          className={`${INPUT} resize-none`}
        />
      </div>

      {/* CV toggle */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px]">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Acepto solicitudes de CV
          </p>
          <p className="font-archivo text-[11px] text-gz-ink-light mt-0.5">
            Otros usuarios podr&aacute;n solicitarte tu CV
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCvAvailable(!cvAvailable)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            cvAvailable ? "bg-gz-gold" : "bg-gz-cream-dark"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              cvAvailable ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

// ─── Tab 2: Seguridad ──────────────────────────────────

function TabSeguridad() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const pwCheck = validatePassword(newPassword);

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Las contrase\u00f1as no coinciden");
      return;
    }
    if (!pwCheck.valid) {
      toast.error(PASSWORD_ERROR_MESSAGE);
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
        toast.error(data.error ?? "Error al cambiar contrase\u00f1a");
        return;
      }
      toast.success("Contrase\u00f1a actualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Error de conexi\u00f3n");
    } finally {
      setSaving(false);
    }
  }

  const strengthItems = [
    { label: "8+ caracteres", ok: pwCheck.hasMinLength },
    { label: "1 may\u00fascula", ok: pwCheck.hasUppercase },
    { label: "2 n\u00fameros", ok: pwCheck.hasTwoNumbers },
  ];

  return (
    <div className="space-y-5">
      <div>
        <label className={LABEL}>Contrase&ntilde;a actual</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={INPUT}
        />
      </div>
      <div>
        <label className={LABEL}>Nueva contrase&ntilde;a</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8+ caracteres, 1 may\u00fascula, 2 n\u00fameros"
          className={INPUT}
        />
        {newPassword && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {strengthItems.map((item) => (
              <span
                key={item.label}
                className={`font-ibm-mono text-[10px] font-medium flex items-center gap-1 ${
                  item.ok ? "text-gz-sage" : "text-gz-ink-light"
                }`}
              >
                {item.ok ? "\u2713" : "\u25CB"} {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className={LABEL}>Confirmar contrase&ntilde;a</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={INPUT}
        />
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="font-archivo text-[11px] text-gz-burgundy mt-1">
            Las contrase&ntilde;as no coinciden
          </p>
        )}
      </div>
      <button
        onClick={handleChangePassword}
        disabled={saving || !currentPassword || !newPassword || !pwCheck.valid}
        className={BTN_PRIMARY}
      >
        {saving ? "Cambiando..." : "Cambiar contrase\u00f1a"}
      </button>
    </div>
  );
}

// ─── Tab 3: Mis Datos (ARCO) ───────────────────────────

function TabDatos({ onGoToProfile }: { onGoToProfile: () => void }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
      a.download = "mis-datos-studio-iuris.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Datos descargados");
    } catch {
      toast.error("Error de conexi\u00f3n");
    }
  }

  async function handleDelete() {
    if (confirmation !== "ELIMINAR") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "ELIMINAR MI CUENTA" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Error al eliminar cuenta");
        return;
      }
      toast.success("Cuenta eliminada");
      window.location.href = "/";
    } catch {
      toast.error("Error de conexi\u00f3n");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Legal info */}
      <div className="p-4 border-l-[3px] border-gz-gold bg-gz-gold/[0.04] rounded-[4px]">
        <p className="font-archivo text-[14px] font-semibold text-gz-ink">
          Tus derechos sobre tus datos
        </p>
        <p className="font-archivo text-[13px] text-gz-ink-mid leading-relaxed mt-2">
          De acuerdo con la Ley 21.719 sobre Protecci&oacute;n de Datos
          Personales, tienes derecho a Acceder, Rectificar, Cancelar y Oponerte
          al tratamiento de tus datos (derechos ARCO).
        </p>
      </div>

      {/* Data we store */}
      <div>
        <p className={LABEL}>Datos que almacenamos</p>
        <ul className="space-y-1.5 mt-2">
          {[
            "Nombre y apellido",
            "Correo electr\u00f3nico",
            "Foto de perfil",
            "Historial de estudio (flashcards, MCQ, simulacros)",
            "Estad\u00edsticas de rendimiento",
            "Historial de participaci\u00f3n en Causas",
          ].map((item) => (
            <li
              key={item}
              className="font-archivo text-[13px] text-gz-ink-mid flex items-start gap-2"
            >
              <span className="text-gz-gold mt-0.5">&bull;</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Download */}
        <button
          onClick={handleExport}
          className={`w-full text-left p-4 border border-gz-rule rounded-[4px] hover:border-gz-gold cursor-pointer transition-colors`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-archivo text-[14px] font-semibold text-gz-ink">
                Descargar mis datos
              </p>
              <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
                Descarga una copia completa en formato JSON
              </p>
            </div>
            <span className="text-lg">📥</span>
          </div>
        </button>

        {/* Modify */}
        <button
          onClick={onGoToProfile}
          className={`w-full text-left p-4 border border-gz-rule rounded-[4px] hover:border-gz-gold cursor-pointer transition-colors`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-archivo text-[14px] font-semibold text-gz-ink">
                Modificar mis datos
              </p>
              <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
                Edita tu nombre, universidad y m&aacute;s
              </p>
            </div>
            <span className="text-lg">✏️</span>
          </div>
        </button>

        {/* Delete */}
        <div className="p-4 border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.04] rounded-[4px]">
          <p className="font-archivo text-[14px] font-semibold text-gz-ink">
            Solicitar eliminaci&oacute;n de cuenta
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-mid mt-1 leading-relaxed">
            Esta acci&oacute;n es irreversible. Se eliminar&aacute;n todos tus
            datos y no podr&aacute;s recuperar tu cuenta.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className={`mt-3 ${BTN_DESTRUCTIVE}`}
          >
            Eliminar mi cuenta
          </button>
        </div>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) =>
            e.target === e.currentTarget && setShowDeleteModal(false)
          }
        >
          <div className="w-full max-w-md bg-white rounded-[6px] border border-gz-rule p-6 shadow-2xl">
            <h3 className="font-cormorant text-[22px] !font-bold text-gz-ink">
              Eliminar cuenta
            </h3>
            <p className="font-archivo text-[13px] text-gz-ink-mid mt-2 leading-relaxed">
              Esta acci&oacute;n es irreversible. Se eliminar&aacute;n todos tus
              datos y no podr&aacute;s recuperar tu cuenta.
            </p>
            <div className="mt-4">
              <label className={LABEL}>
                Escribe <strong>ELIMINAR</strong> para confirmar
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="ELIMINAR"
                className={`${INPUT} border-gz-burgundy/30 focus:border-gz-burgundy focus:ring-gz-burgundy/20`}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmation("");
                }}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmation !== "ELIMINAR" || deleting}
                className={BTN_DESTRUCTIVE}
              >
                {deleting ? "Eliminando..." : "Eliminar permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Preferencias ────────────────────────────────

function TabPreferencias() {
  const [theme, setTheme] = useState<string>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      {/* Theme toggle */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px]">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Tema visual
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            {theme === "dark" ? "Arca Romana (noche)" : "Papel & Tinta (d\u00eda)"}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            theme === "dark" ? "bg-gz-gold" : "bg-gz-cream-dark"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              theme === "dark" ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Email notifications — placeholder */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px] opacity-60">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Notificaciones por email
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            Pr&oacute;ximamente
          </p>
        </div>
        <div className="relative w-11 h-6 rounded-full bg-gz-cream-dark cursor-not-allowed">
          <span className="absolute top-0.5 translate-x-0.5 w-5 h-5 rounded-full bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}
