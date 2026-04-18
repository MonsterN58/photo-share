import type { LocalUser, Profile } from "@/types";
import { getDatabaseMode } from "@/lib/database-mode";
import { getCurrentUser as getLocalUser, getCurrentUserWithProfile as getLocalUserWithProfile } from "@/lib/local-auth";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

function normalizeRemoteUser(user: {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: { username?: string };
}): LocalUser {
  return {
    id: user.id,
    email: user.email || "",
    created_at: user.created_at || new Date().toISOString(),
    user_metadata: user.user_metadata,
  };
}

export async function getCurrentUser(): Promise<LocalUser | null> {
  if (getDatabaseMode() === "local") {
    return getLocalUser();
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? normalizeRemoteUser(user) : null;
}

export async function getCurrentUserWithProfile(): Promise<{
  user: LocalUser | null;
  profile: Profile | null;
}> {
  if (getDatabaseMode() === "local") {
    return getLocalUserWithProfile();
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user: normalizeRemoteUser(user),
    profile: (profile as Profile | null) ?? null,
  };
}
