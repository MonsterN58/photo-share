"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validators";
import { redirect } from "next/navigation";

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
  const supabase = await createClient();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: getLoginErrorMessage(error.message) };
  }

  redirect("/");
}

export async function register(formData: FormData) {
  const supabase = await createClient();

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { username: parsed.data.username },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      message: "注册成功，请先打开邮箱里的确认链接，然后再登录。",
    };
  }

  // Create profile when the project allows immediate sign-in after signup.
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      username: parsed.data.username,
      avatar_url: null,
      bio: null,
    });

    if (profileError) {
      return { error: profileError.message };
    }
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
