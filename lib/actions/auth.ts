"use server";

import { clearLoginSession, createLoginSession, hashPassword, verifyPassword } from "@/lib/local-auth";
import { createUser, getUserByEmail } from "@/lib/local-db";
import { getDatabaseMode } from "@/lib/database-mode";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validators";

function getLoginErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "邮箱还没有确认，请先打开注册邮件完成确认。";
  }

  if (normalized.includes("invalid login credentials")) {
    return "邮箱或密码错误。";
  }

  return message || "登录失败，请稍后再试。";
}

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: getLoginErrorMessage(error.message) };
    return { success: true };
  }

  const user = getUserByEmail(parsed.data.email);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: getLoginErrorMessage("invalid login credentials") };
  }

  await createLoginSession(user.id);
  return { success: true };
}

export async function register(formData: FormData) {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { username: parsed.data.username },
      },
    });

    if (error) return { error: error.message };

    if (!data.session) {
      return { message: "注册成功，请先打开邮箱里的确认链接，然后再登录。" };
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        username: parsed.data.username,
        avatar_url: null,
        bio: null,
      });

      if (profileError) return { error: profileError.message };
    }

    return { success: true };
  }

  if (getUserByEmail(parsed.data.email)) {
    return { error: "该邮箱已经注册。" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = createUser(parsed.data.email, passwordHash, parsed.data.username);
  await createLoginSession(user.id);
  return { success: true };
}

export async function logout() {
  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    await supabase.auth.signOut();
    return { success: true };
  }

  await clearLoginSession();
  return { success: true };
}
