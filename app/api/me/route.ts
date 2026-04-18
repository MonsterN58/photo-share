import { NextResponse } from "next/server";
import { getCurrentUserWithProfile } from "@/lib/auth-adapter";

export async function GET() {
  const data = await getCurrentUserWithProfile();
  return NextResponse.json(data);
}
