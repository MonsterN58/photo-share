"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User, UserResponse } from "@supabase/supabase-js";
import type { Profile } from "@/types";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const syncUser = async (nextUser: User | null) => {
      userRef.current = nextUser;

      if (!active) return;

      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data: nextProfile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", nextUser.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          setProfile(null);
        } else {
          setProfile((nextProfile as Profile | null) ?? null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void supabase.auth
      .getUser()
      .then((result: UserResponse) => syncUser(result.data.user ?? null))
      .catch(() => {
        if (active) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      void syncUser(session?.user ?? null);
    });

    const handleProfileUpdated = () => {
      void syncUser(userRef.current);
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, []);

  return { user, profile, loading };
}
