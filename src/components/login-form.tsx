"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "password" | "code";
type CodeStep = "email" | "code" | "set-password";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("password");
  const [codeStep, setCodeStep] = useState<CodeStep>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [devCode, setDevCode] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish() {
    router.push(next);
    router.refresh();
  }

  function switchMode(target: Mode) {
    setMode(target);
    setError(null);
    setCode("");
    setDevCode(null);
    setSent(false);
    setCodeStep("email");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "登录失败");
        return;
      }
      finish();
    } catch {
      setError("网络出了点问题,请再试一次");
    } finally {
      setBusy(false);
    }
  }

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "发送失败,请稍后再试");
        return;
      }
      setSent(Boolean(data.sent));
      setDevCode(data.devCode ?? null);
      setCodeStep("code");
    } catch {
      setError("网络出了点问题,请再试一次");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "验证失败");
        return;
      }
      if (data.hasPassword) {
        finish();
      } else {
        setCodeStep("set-password");
      }
    } catch {
      setError("网络出了点问题,请再试一次");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (newPassword.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "设置失败");
        return;
      }
      finish();
    } catch {
      setError("网络出了点问题,请再试一次");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "password"
      ? "登录嘴替"
      : codeStep === "set-password"
        ? "设置登录密码"
        : codeStep === "code"
          ? "输入验证码"
          : "邮箱验证码登录";

  const subtitle =
    mode === "password"
      ? "用邮箱 + 密码登录。第一次使用,先用验证码登录并设置密码。"
      : codeStep === "set-password"
        ? "设置后,下次可以直接用邮箱 + 密码登录;验证码仍可用于找回。"
        : codeStep === "code"
          ? `验证码已发送到 ${email}。`
          : "输入邮箱接收验证码。第一次登录会自动创建账号,并让你设置密码。";

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="card p-7 sm:p-8">
        <div className="mb-6">
          <h1 className="text-[1.55rem] font-bold tracking-tight text-stone-900">
            {title}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-stone-500">{subtitle}</p>
        </div>

        {mode === "password" && (
          <form onSubmit={passwordLogin} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
                className="field"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? "登录中…" : "登录"}
            </button>

            <div className="flex items-center justify-between pt-1 text-[12.5px]">
              <button
                type="button"
                onClick={() => switchMode("code")}
                className="text-amber-700 transition hover:text-amber-900"
              >
                首次登录 / 忘记密码
              </button>
              <span className="text-stone-400">用验证码登录</span>
            </div>
          </form>
        )}

        {mode === "code" && codeStep === "email" && (
          <form onSubmit={requestCode} className="space-y-4">
            <div>
              <label className="label" htmlFor="email-code">
                邮箱
              </label>
              <input
                id="email-code"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="field"
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? "发送中…" : "发送验证码"}
            </button>

            <button
              type="button"
              onClick={() => switchMode("password")}
              className="w-full text-center text-[12.5px] text-stone-500 transition hover:text-stone-900"
            >
              ← 返回密码登录
            </button>
          </form>
        )}

        {mode === "code" && codeStep === "code" && (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <label className="label" htmlFor="code">
                6 位验证码
              </label>
              <input
                id="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="field text-center text-[1.35rem] font-semibold tracking-[0.5em]"
              />
            </div>

            {devCode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-5 text-amber-800">
                <span className="font-semibold">开发模式</span>
                :验证码是{" "}
                <span className="font-mono text-[15px] font-bold tracking-widest">
                  {devCode}
                </span>
                <span className="block text-[11.5px] text-amber-700/80">
                  配置 SMTP 后将改为邮件发送,不会显示在页面上。
                </span>
              </div>
            )}

            {!devCode && sent && (
              <p className="text-[12.5px] text-stone-500">
                没收到?检查一下垃圾邮件,或稍后重新获取。
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? "验证中…" : "验证并登录"}
            </button>

            <div className="flex items-center justify-between pt-1 text-[12.5px]">
              <button
                type="button"
                onClick={() => {
                  setCodeStep("email");
                  setCode("");
                  setDevCode(null);
                  setError(null);
                }}
                className="text-stone-500 transition hover:text-stone-900"
              >
                ← 换个邮箱
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => requestCode()}
                className="text-amber-700 transition hover:text-amber-900 disabled:opacity-50"
              >
                重新获取
              </button>
            </div>
          </form>
        )}

        {mode === "code" && codeStep === "set-password" && (
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="label" htmlFor="new-password">
                新密码
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 8 位"
                className="field"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="label" htmlFor="confirm-password">
                确认密码
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再输一次"
                className="field"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3">
              {busy ? "保存中…" : "设置密码并进入"}
            </button>

            <p className="text-center text-[11.5px] leading-5 text-stone-400">
              设置后,也可以随时在控制台「设置」里修改。
            </p>
          </form>
        )}
      </div>

      <p className="mt-5 text-center text-[12px] leading-5 text-stone-500">
        登录即表示你同意:只把愿意公开的材料放进来。
        <br />
        对方无需注册,打开分享链接或小程序卡片即可提问。
      </p>
    </div>
  );
}
