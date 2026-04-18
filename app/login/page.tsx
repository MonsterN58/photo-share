"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-10rem)] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get("tab") === "register";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const switchMode = () => {
    const nextIsRegister = !isRegister;
    setError("");
    setMessage("");
    router.replace(nextIsRegister ? "/login?tab=register" : "/login", { scroll: false });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isRegister
        ? await register(formData)
        : await login(formData);

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }

      if (result && "message" in result && typeof result.message === "string") {
        setMessage(result.message);
        toast.success(result.message);
      }

      if (result && "success" in result && result.success) {
        window.dispatchEvent(new Event("auth-changed"));
        router.replace("/");
        router.refresh();
      }

    });
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-900">
            <Image
              src="/nku-logo.png"
              alt="NKU印象"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="text-xl font-semibold tracking-tight">NKU印象</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-6">
            {isRegister ? "创建账号" : "欢迎回来"}
          </h1>
          <p className="text-sm text-gray-500">
            {isRegister ? "加入 NKU印象社区" : "登录你的 NKU印象账号"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-gray-700">
                用户名
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                placeholder="你的用户名"
                className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-gray-700">
              邮箱
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-gray-700">
              密码
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="至少 6 位"
              className="h-11 bg-gray-50 border-gray-200 focus:bg-white"
            />
          </div>

          {isRegister && (
            <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <div className="max-h-44 space-y-3 overflow-y-auto pr-1 leading-6">
                <p>
                  欢迎加入 南开印象（nku.asia）。本网站为学生自发搭建的校园摄影分享平台，旨在为摄影爱好者提供作品展示与交流空间。本站与南开大学官方无隶属关系，不代表学校官方立场。
                </p>
                <p>注册即表示你已知悉并同意：</p>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>你发布的图片、文字等内容应当合法合规，不得侵犯他人著作权、肖像权、隐私权等合法权益；</li>
                  <li>你应保证对上传作品拥有相应权利或已获得必要授权；</li>
                  <li>本站禁止发布违法、侵权、低俗、攻击性或其他不当内容；</li>
                  <li>如有违规内容，本站有权删除相关内容并限制账号使用。</li>
                </ol>
              </div>
              <label className="flex items-start gap-2 border-t border-gray-200 pt-3 text-gray-700">
                <input
                  name="agreeTerms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span>我已阅读并同意上述用户协议与隐私说明</span>
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {message && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full h-11" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRegister ? (
              "注册"
            ) : (
              "登录"
            )}
          </Button>
        </form>

        {/* Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            {isRegister ? "已有账号？登录" : "没有账号？注册"}
          </button>
        </div>

        {/* OAuth placeholder */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">更多登录方式即将推出</span>
          </div>
        </div>
      </div>
    </div>
  );
}
