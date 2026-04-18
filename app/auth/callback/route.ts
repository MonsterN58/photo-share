import { NextResponse } from "next/server";
import { getDatabaseMode } from "@/lib/database-mode";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (getDatabaseMode() === "remote") {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (code) {
      const supabase = await createSupabaseClient();
      await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
