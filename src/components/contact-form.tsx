"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ContactForm({
  capsules,
  defaultCapsuleId,
}: {
  capsules: { id: string; title: string }[];
  defaultCapsuleId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [capsuleId, setCapsuleId] = useState(
    defaultCapsuleId && capsules.some((c) => c.id === defaultCapsuleId)
      ? defaultCapsuleId
      : capsules[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (capsules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white/40 px-4 py-8 text-center">
        <p className="text-[13px] font-medium text-stone-700">
          先创建嘴替,才能绑定给好友
        </p>
        <Link href="/dashboard/new" className="btn-primary mt-4 px-4 py-2 text-[12.5px]">
          创建嘴替
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("给这个好友起个备注名吧");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note, capsuleId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "创建失败");
        return;
      }
      setName("");
      setNote("");
      router.refresh();
    } catch {
      setError("网络出了点问题,请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div>
          <label className="label" htmlFor="contact-name">
            好友备注名
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="例如:王总 / 李姐 / 阿哲"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact-capsule">
            绑定哪个嘴替
          </label>
          <select
            id="contact-capsule"
            value={capsuleId}
            onChange={(e) => setCapsuleId(e.target.value)}
            className="field"
          >
            {capsules.map((capsule) => (
              <option key={capsule.id} value={capsule.id}>
                {capsule.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="contact-note">
          备注(可选)
        </label>
        <input
          id="contact-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
          placeholder="例如:只聊星辰项目 / 老同学,别太正式"
          className="field"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] leading-5 text-stone-500">
          对方打开专属链接后,只会跟这个嘴替对话,看不到其他内容。
        </p>
        <button type="submit" disabled={busy} className="btn-primary shrink-0 px-4 py-2.5 text-[13px]">
          {busy ? "生成中…" : "生成专属链接"}
        </button>
      </div>
    </form>
  );
}
