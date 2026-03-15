"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { ProfileModal } from "./profile-modal";

interface AvatarDropdownProps {
  userId: string;
  firstName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export function AvatarDropdown({ userId, firstName, avatarUrl: initialAvatarUrl, isAdmin }: AvatarDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = firstName[0]?.toUpperCase() ?? "U";

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const openProfile = useCallback(async () => {
    setOpen(false);
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile-summary");
      if (!res.ok) return;
      const data = await res.json();
      setProfileData(data);
      setShowProfile(true);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white transition-opacity hover:opacity-80 overflow-hidden disabled:opacity-60"
          title="Mi perfil"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={firstName} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy/50">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-[4px] border border-gz-rule bg-white py-1.5 shadow-sm">
            <button
              onClick={openProfile}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
            >
              <span className="text-base">👤</span>
              Ver mi perfil
            </button>
            <Link
              href={`/dashboard/perfil/${userId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
            >
              <span className="text-base">🌐</span>
              Perfil público
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <span className="text-base">🛡️</span>
                Panel Admin
              </Link>
            )}
            <div className="my-1 border-t border-gz-rule" />
            <button
              onClick={() => { setOpen(false); setShowLogoutConfirm(true); }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gz-burgundy hover:bg-gz-burgundy/10 transition-colors"
            >
              <span className="text-base">🚪</span>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLogoutConfirm(false)}>
          <div className="mx-4 w-full max-w-sm rounded-[4px] bg-white p-6 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-navy">¿Cerrar sesión?</h3>
            <p className="mt-2 text-sm text-navy/60">Tendrás que volver a iniciar sesión para acceder a tu cuenta.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowLogoutConfirm(false)}
                className="rounded-[3px] px-4 py-2 text-sm font-medium text-navy/70 transition-colors hover:bg-navy/5">
                Cancelar
              </button>
              <form action={logout}>
                <button type="submit"
                  className="rounded-[3px] bg-gz-burgundy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gz-burgundy/80">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && profileData && (
        <ProfileModal
          profile={{
            id: profileData.id as string,
            firstName: profileData.firstName as string,
            lastName: profileData.lastName as string,
            email: profileData.email as string,
            bio: profileData.bio as string | null,
            avatarUrl: profileData.avatarUrl as string | null,
            universidad: profileData.universidad as string | null,
            sede: profileData.sede as string | null,
            universityYear: profileData.universityYear as number | null,
            cvAvailable: profileData.cvAvailable as boolean,
            xp: profileData.xp as number,
            causasGanadas: profileData.causasGanadas as number,
            tier: profileData.tier as string | null,
            flashcardsMastered: profileData.flashcardsMastered as number,
            badgeCount: profileData.badgeCount as number,
            earnedBadges: profileData.earnedBadges as string[],
          }}
          onClose={() => setShowProfile(false)}
          onProfileUpdate={(updates) => {
            setProfileData((prev) => prev ? { ...prev, ...updates } : prev);
            if (updates.avatarUrl !== undefined) setAvatarUrl(updates.avatarUrl ?? null);
          }}
        />
      )}
    </>
  );
}
