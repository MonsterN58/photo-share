import { cookies } from "next/headers";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  deleteSession,
  getProfile,
  getUserBySession,
  upsertSession,
} from "@/lib/local-db";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "photoshare_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== key.length) return false;
  return timingSafeEqual(stored, key);
}

export async function createLoginSession(userId: string) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  upsertSession(sessionId, userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearLoginSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) deleteSession(sessionId);
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getUserBySession(sessionId) ?? null;
}

export async function getCurrentUserWithProfile() {
  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null };
  return { user, profile: getProfile(user.id) ?? null };
}
