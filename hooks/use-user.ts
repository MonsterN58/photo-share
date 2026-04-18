"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { LocalUser, Profile } from "@/types";

interface UseUserOptions {
  initialUser?: LocalUser | null;
  initialProfile?: Profile | null;
}

export function useUser({ initialUser = null, initialProfile = null }: UseUserOptions = {}) {
  const [user, setUser] = useState<LocalUser | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialUser);
  const pathname = usePathname();

  const syncUser = useCallback(async (active: () => boolean = () => true) => {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (!response.ok) {
        if (active()) {
          setUser(null);
          setProfile(null);
        }
        return;
      }
      const data = (await response.json()) as {
        user: LocalUser | null;
        profile: Profile | null;
      };
      if (!active()) return;
      setUser(data.user);
      setProfile(data.profile);
    } finally {
      if (active()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void syncUser(() => active);

    return () => {
      active = false;
    };
  }, [pathname, syncUser]);

  useEffect(() => {
    const handleUserChanged = () => {
      setLoading(true);
      void syncUser();
    };

    window.addEventListener("auth-changed", handleUserChanged);
    window.addEventListener("profile-updated", handleUserChanged);
    return () => {
      window.removeEventListener("auth-changed", handleUserChanged);
      window.removeEventListener("profile-updated", handleUserChanged);
    };
  }, [syncUser]);

  return { user, profile, loading };
}
