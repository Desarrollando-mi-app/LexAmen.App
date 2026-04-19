"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ProfileDropdownProps {
  userName: string;
  email: string;
  avatarUrl: string | null;
  grado: number;
  gradoNombre: string;
  isAdmin: boolean;
  userId: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileDropdown({
  userName,
  email,
  avatarUrl,
  grado,
  gradoNombre,
  isAdmin,
  userId,
}: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initials = getInitials(userName);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Grado color mapping by nivel
  const gradoColor =
    grado <= 3
      ? "#8a8073" // ESCUELA
      : grado <= 14
      ? "#9a7230" // PRACTICA
      : grado <= 18
      ? "#1e4080" // ESTRADO
      : grado <= 30
      ? "#8b1a1a" // MAGISTRATURA
      : "#1a1a2e"; // CONSEJO

  return (
    <div ref={ref} className="relative">
      {/* Avatar + grado badge */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-full bg-gz-navy flex items-center justify-center text-gz-gold-bright text-xs font-semibold shrink-0 overflow-hidden ring-2 ring-transparent group-hover:ring-gz-gold/30 transition-all">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="font-archivo text-[13px] font-semibold text-gz-ink">
            {userName}
          </span>
          <span
            className="font-ibm-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: gradoColor }}
          >
            {gradoNombre}
          </span>
          <span className="text-[8px] text-gz-ink-light">▾</span>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-lg border border-gz-rule bg-white shadow-lg z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gz-rule">
            <p className="font-archivo text-[14px] font-semibold text-gz-ink truncate">
              {userName}
            </p>
            <p className="font-archivo text-[12px] text-gz-ink-light truncate">
              {email}
            </p>
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-gold uppercase tracking-[1px]">
              Grado {grado} · {gradoNombre}
            </p>
          </div>

          {/* Navigation links */}
          <div className="py-1">
            <DropdownLink href={`/dashboard/perfil/${userId}`} icon="👤" label="Mi Perfil" onClick={() => setOpen(false)} />
            <DropdownLink href="/dashboard/perfil/configuracion" icon="⚙️" label="Configuración" onClick={() => setOpen(false)} />
            <DropdownLink href="/privacidad" icon="🔒" label="Privacidad" onClick={() => setOpen(false)} />
            {isAdmin && (
              <DropdownLink href="/admin/resumen" icon="📊" label="Panel Admin" onClick={() => setOpen(false)} />
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gz-rule py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 font-archivo text-[13px] text-gz-burgundy hover:bg-gz-burgundy/5 transition-colors"
            >
              <span>🚪</span>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 font-archivo text-[13px] text-gz-ink hover:bg-gz-gold/5 transition-colors"
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
