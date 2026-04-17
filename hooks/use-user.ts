"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import type { AuthChangeEvent, Session, User, UserResponse } from "@supabase/supabase-js";
import type { Profile } from "@/types";

interface UseUserOptions {
  initialUser?: User | null;
  initialProfile?: Profile | null;
}

export function useUser({ initialUser = null, initialProfile = null }: UseUserOptions = {}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialUser);
  const userRef = useRef<User | null>(initialUser);
  const initialUserRef = useRef<User | null>(initialUser);

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
      .then((result: UserResponse) => {
        const nextUser = result.data.user ?? null;

        if (!nextUser && initialUserRef.current) {
          if (!active) return;
          setLoading(false);
          return;
        }

        void syncUser(nextUser);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "INITIAL_SESSION" && !session?.user && initialUserRef.current) {
        if (!active) return;
        setLoading(false);
        return;
      }

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
