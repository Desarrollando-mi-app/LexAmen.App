"use client";

import { useState, useCallback } from "react";
import { ProfileModal } from "./profile-modal";

interface HeaderAvatarProps {
  userId: string;
  firstName: string;
  avatarUrl: string | null;
}

export function HeaderAvatar({ firstName, avatarUrl: initialAvatarUrl }: HeaderAvatarProps) {
  const [showModal, setShowModal] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);

  const initials = firstName[0]?.toUpperCase() ?? "U";

  const openModal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile-summary");
      if (!res.ok) return;
      const data = await res.json();
      setProfileData(data);
      setShowModal(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <button
        onClick={openModal}
        disabled={loading}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white transition-opacity hover:opacity-80 overflow-hidden disabled:opacity-60"
        title="Mi perfil"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={firstName}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/50">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>

      {showModal && profileData && (
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
          onClose={() => setShowModal(false)}
          onProfileUpdate={(updates) => {
            setProfileData((prev) => prev ? { ...prev, ...updates } : prev);
            if (updates.avatarUrl !== undefined) {
              setAvatarUrl(updates.avatarUrl ?? null);
            }
          }}
        />
      )}
    </>
  );
}
