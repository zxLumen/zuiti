"use client";

import { useState } from "react";

export function PasswordSettings({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
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
    setMessage(null);
    setBusy(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      setMessage(hasPassword ? "密码已更新。" : "密码已设置,下次可以用邮箱 + 密码登录。");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("网络出了点问题,请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {hasPassword && (
        <div>
          <label className="label" htmlFor="current-password">
            当前密码
          </label>
          <input
            id="current-password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="field"
            autoComplete="current-password"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="new-password">
          {hasPassword ? "新密码" : "设置密码"}
        </label>
        <input
          id="new-password"
          type="password"
          required
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
      {message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
          {message}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 text-[13px]">
        {busy ? "保存中…" : hasPassword ? "更新密码" : "设置密码"}
      </button>
    </form>
  );
}
