"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  getAudioEnabled,
  setAudioEnabled,
  getAnimationsEnabled,
  setAnimationsEnabled,
} from "@/lib/sounds";
import {
  UNIVERSIDAD_NOMBRES,
  getSedesForUniversidad,
} from "@/lib/universidades";
import {
  REGIONES_CHILE,
  getCortesForRegion,
} from "@/lib/regiones-chile";
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
  region: string | null;
  corte: string | null;
  visibleEnRanking: boolean;
  visibleEnLiga: boolean;
  etapa: string | null;
  anoIngreso: number | null;
  anoEgreso: number | null;
  anoJura: number | null;
  empleoActual: string | null;
  cargoActual: string | null;
  especialidades: string | null;
  intereses: string | null;
  linkedin: string | null;
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

const ESPECIALIDAD_OPTIONS = ["Derecho Civil", "Derecho Procesal Civil", "Derecho Orgánico"];

const INTERES_OPTIONS = [
  "Obligaciones", "Bienes", "Acto Jurídico", "Responsabilidad", "Contratos",
  "Sucesiones", "Familia", "Procedimiento Ordinario", "Recursos", "Ejecución",
];

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
        {tab === "preferencias" && (
          <TabPreferencias
            user={user}
            onUpdate={(updates) => setUser((u) => ({ ...u, ...updates }))}
          />
        )}
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
  const [etapa, setEtapa] = useState(user.etapa ?? "");
  const [anoIngreso, setAnoIngreso] = useState<number | null>(user.anoIngreso ?? null);
  const [anoEgreso, setAnoEgreso] = useState<number | null>(user.anoEgreso ?? null);
  const [anoJura, setAnoJura] = useState<number | null>(user.anoJura ?? null);
  const [empleoActual, setEmpleoActual] = useState(user.empleoActual ?? "");
  const [cargoActual, setCargoActual] = useState(user.cargoActual ?? "");
  const [especialidades, setEspecialidades] = useState<string[]>(() => {
    try { return user.especialidades ? JSON.parse(user.especialidades) : []; }
    catch { return []; }
  });
  const [interesesState, setInteresesState] = useState<string[]>(() => {
    try { return user.intereses ? JSON.parse(user.intereses) : []; }
    catch { return []; }
  });
  const [linkedin, setLinkedin] = useState(user.linkedin ?? "");
  const [region, setRegion] = useState(user.region ?? "");
  const [corte, setCorte] = useState(user.corte ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sedesDisponibles = universidad
    ? getSedesForUniversidad(universidad)
    : [];
  const cortesDisponibles = region
    ? getCortesForRegion(region)
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
          region: region || null,
          corte: corte || null,
          etapa: etapa || null,
          anoIngreso: anoIngreso,
          anoEgreso: anoEgreso,
          anoJura: anoJura,
          empleoActual: empleoActual || null,
          cargoActual: cargoActual || null,
          especialidades: especialidades.length > 0 ? JSON.stringify(especialidades) : null,
          intereses: interesesState.length > 0 ? JSON.stringify(interesesState) : null,
          linkedin: linkedin || null,
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
        region: region || null,
        corte: corte || null,
        etapa: etapa || null,
        anoIngreso,
        anoEgreso,
        anoJura,
        empleoActual: empleoActual || null,
        cargoActual: cargoActual || null,
        especialidades: especialidades.length > 0 ? JSON.stringify(especialidades) : null,
        intereses: interesesState.length > 0 ? JSON.stringify(interesesState) : null,
        linkedin: linkedin || null,
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

      {/* Facultad */}
      <div>
        <label className={LABEL}>Facultad</label>
        <select
          value={universidad}
          onChange={(e) => {
            setUniversidad(e.target.value);
            setSede("");
          }}
          className={INPUT}
        >
          <option value="">Selecciona una facultad</option>
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

      {/* Region */}
      <div>
        <label className={LABEL}>Regi&oacute;n</label>
        <select
          value={region}
          onChange={(e) => {
            setRegion(e.target.value);
            setCorte("");
          }}
          className={INPUT}
        >
          <option value="">Selecciona una regi&oacute;n</option>
          {REGIONES_CHILE.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Corte de Apelaciones */}
      {cortesDisponibles.length > 0 && (
        <div>
          <label className={LABEL}>Corte de Apelaciones</label>
          <select
            value={corte}
            onChange={(e) => setCorte(e.target.value)}
            className={INPUT}
          >
            <option value="">Selecciona una corte</option>
            {cortesDisponibles.map((c) => (
              <option key={c} value={c}>
                Corte de {c}
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
            ({bio.length}/500)
          </span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Cu&eacute;ntanos sobre ti..."
          className={`${INPUT} resize-none`}
        />
      </div>

      {/* ── Perfil Profesional ── */}
      <div className="pt-3">
        <hr className="border-gz-rule mb-4" />
        <p className="font-cormorant text-[18px] font-bold text-gz-ink mb-4">
          Perfil Profesional
        </p>
      </div>

      {/* Etapa actual */}
      <div>
        <label className={LABEL}>Etapa actual</label>
        <select
          value={etapa}
          onChange={(e) => setEtapa(e.target.value)}
          className={INPUT}
        >
          <option value="">Sin especificar</option>
          <option value="estudiante">Estudiante</option>
          <option value="egresado">Egresado/a</option>
          <option value="abogado">Abogado/a</option>
        </select>
      </div>

      {/* Año de ingreso */}
      {etapa && (
        <div>
          <label className={LABEL}>A&ntilde;o de ingreso</label>
          <input
            type="number"
            value={anoIngreso ?? ""}
            onChange={(e) => setAnoIngreso(e.target.value ? Number(e.target.value) : null)}
            placeholder="Ej: 2020"
            className={INPUT}
          />
        </div>
      )}

      {/* Año de egreso */}
      {(etapa === "egresado" || etapa === "abogado") && (
        <div>
          <label className={LABEL}>A&ntilde;o de egreso</label>
          <input
            type="number"
            value={anoEgreso ?? ""}
            onChange={(e) => setAnoEgreso(e.target.value ? Number(e.target.value) : null)}
            placeholder="Ej: 2025"
            className={INPUT}
          />
        </div>
      )}

      {/* Año de jura */}
      {etapa === "abogado" && (
        <div>
          <label className={LABEL}>A&ntilde;o de jura</label>
          <input
            type="number"
            value={anoJura ?? ""}
            onChange={(e) => setAnoJura(e.target.value ? Number(e.target.value) : null)}
            placeholder="Ej: 2026"
            className={INPUT}
          />
        </div>
      )}

      {/* Empleo actual */}
      {etapa === "abogado" && (
        <div>
          <label className={LABEL}>Empleo actual</label>
          <input
            type="text"
            value={empleoActual}
            onChange={(e) => setEmpleoActual(e.target.value.slice(0, 100))}
            maxLength={100}
            placeholder="Ej: Estudio Jurídico Silva & Asociados"
            className={INPUT}
          />
        </div>
      )}

      {/* Cargo actual */}
      {etapa === "abogado" && (
        <div>
          <label className={LABEL}>Cargo actual</label>
          <input
            type="text"
            value={cargoActual}
            onChange={(e) => setCargoActual(e.target.value.slice(0, 100))}
            maxLength={100}
            placeholder="Ej: Abogado asociado"
            className={INPUT}
          />
        </div>
      )}

      {/* Especialidades declaradas */}
      <div>
        <label className={LABEL}>Especialidades declaradas</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {ESPECIALIDAD_OPTIONS.map((esp) => {
            const selected = especialidades.includes(esp);
            return (
              <button
                key={esp}
                type="button"
                onClick={() =>
                  setEspecialidades((prev) =>
                    selected ? prev.filter((e) => e !== esp) : [...prev, esp]
                  )
                }
                className={`px-3 py-1.5 rounded-full font-archivo text-[13px] transition-colors cursor-pointer ${
                  selected
                    ? "bg-gz-gold text-gz-navy font-semibold"
                    : "border border-gz-rule text-gz-ink-mid hover:border-gz-gold"
                }`}
              >
                {esp}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intereses */}
      <div>
        <label className={LABEL}>Intereses</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {INTERES_OPTIONS.map((int) => {
            const selected = interesesState.includes(int);
            return (
              <button
                key={int}
                type="button"
                onClick={() =>
                  setInteresesState((prev) =>
                    selected ? prev.filter((i) => i !== int) : [...prev, int]
                  )
                }
                className={`px-3 py-1.5 rounded-full font-archivo text-[13px] transition-colors cursor-pointer ${
                  selected
                    ? "bg-gz-gold text-gz-navy font-semibold"
                    : "border border-gz-rule text-gz-ink-mid hover:border-gz-gold"
                }`}
              >
                {int}
              </button>
            );
          })}
        </div>
      </div>

      {/* LinkedIn */}
      <div>
        <label className={LABEL}>LinkedIn</label>
        <input
          type="text"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          placeholder="https://linkedin.com/in/tu-perfil"
          className={INPUT}
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
                Edita tu nombre, facultad y m&aacute;s
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

function TabPreferencias({
  user,
  onUpdate,
}: {
  user: UserData;
  onUpdate: (updates: Partial<UserData>) => void;
}) {
  const [theme, setTheme] = useState<string>("dark");
  const [mounted, setMounted] = useState(false);
  const [visibleEnRanking, setVisibleEnRanking] = useState(user.visibleEnRanking);
  const [visibleEnLiga, setVisibleEnLiga] = useState(user.visibleEnLiga);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [animationsOn, setAnimationsOn] = useState(true);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored);
    setSoundOn(getAudioEnabled());
    setAnimationsOn(getAnimationsEnabled());
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  async function handleToggleVisibility(field: "visibleEnRanking" | "visibleEnLiga", value: boolean) {
    if (field === "visibleEnRanking") setVisibleEnRanking(value);
    else setVisibleEnLiga(value);

    setSavingVisibility(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        // Revert on error
        if (field === "visibleEnRanking") setVisibleEnRanking(!value);
        else setVisibleEnLiga(!value);
        toast.error("Error al actualizar visibilidad");
        return;
      }
      onUpdate({ [field]: value });
      toast.success(value ? "Ahora eres visible" : "Ahora eres invisible");
    } catch {
      if (field === "visibleEnRanking") setVisibleEnRanking(!value);
      else setVisibleEnLiga(!value);
      toast.error("Error de conexión");
    } finally {
      setSavingVisibility(false);
    }
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
            {theme === "dark" ? "Arca Romana (noche)" : "Papel & Tinta (día)"}
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

      {/* Sound & Animations section */}
      <div className="pt-2">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
          Sonido y animaciones
        </p>
        <div className="border-b border-gz-rule mt-2" />
      </div>

      {/* Sound toggle */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px]">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Sonidos activados
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            Efectos de sonido al responder, ganar XP, subir de grado, etc.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !soundOn;
            setSoundOn(next);
            setAudioEnabled(next);
            toast.success(next ? "Sonidos activados" : "Sonidos desactivados");
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            soundOn ? "bg-gz-gold" : "bg-gz-cream-dark"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              soundOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Animations toggle */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px]">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Animaciones activadas
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            Confetti, efectos visuales en logros y respuestas
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !animationsOn;
            setAnimationsOn(next);
            setAnimationsEnabled(next);
            toast.success(
              next ? "Animaciones activadas" : "Animaciones desactivadas"
            );
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            animationsOn ? "bg-gz-gold" : "bg-gz-cream-dark"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              animationsOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Onboarding reset */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px]">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Repetir tutorial de bienvenida
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            Volver a hacer el onboarding paso a paso
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await fetch("/api/onboarding", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ step: 0, data: {}, reset: true }),
              });
              toast.success("Tutorial reiniciado. Redirigiendo...");
              setTimeout(() => window.location.href = "/dashboard", 1000);
            } catch {
              toast.error("Error al reiniciar tutorial");
            }
          }}
          className="rounded-[3px] border border-gz-rule px-3 py-1.5 font-archivo text-[12px] font-medium text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
        >
          Repetir →
        </button>
      </div>

      {/* Privacy section header */}
      <div className="pt-2">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
          Privacidad
        </p>
        <div className="border-b border-gz-rule mt-2" />
      </div>

      {/* Visible en Ranking */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px]">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Aparecer en el Ranking
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            Tu nombre aparecerá en las tablas de ranking público
          </p>
        </div>
        <button
          type="button"
          disabled={savingVisibility}
          onClick={() => handleToggleVisibility("visibleEnRanking", !visibleEnRanking)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            visibleEnRanking ? "bg-gz-gold" : "bg-gz-cream-dark"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              visibleEnRanking ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Visible en Liga */}
      <div className="flex items-center justify-between p-4 border border-gz-rule rounded-[4px]">
        <div>
          <p className="font-archivo text-[14px] font-medium text-gz-ink">
            Mostrar identidad en la Liga
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5">
            Si desactivas, aparecerás como &quot;Estudiante anónimo&quot; para otros
          </p>
        </div>
        <button
          type="button"
          disabled={savingVisibility}
          onClick={() => handleToggleVisibility("visibleEnLiga", !visibleEnLiga)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            visibleEnLiga ? "bg-gz-gold" : "bg-gz-cream-dark"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              visibleEnLiga ? "translate-x-5" : "translate-x-0.5"
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
            Próximamente
          </p>
        </div>
        <div className="relative w-11 h-6 rounded-full bg-gz-cream-dark cursor-not-allowed">
          <span className="absolute top-0.5 translate-x-0.5 w-5 h-5 rounded-full bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}
