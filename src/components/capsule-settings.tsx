"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CapsuleSettingsProps = {
  id: string;
  title: string;
  subtitle: string;
  ownerName: string;
  transparency: string;
  strictness: string;
};

export function CapsuleSettings(props: CapsuleSettingsProps) {
  const router = useRouter();

  const [title, setTitle] = useState(props.title);
  const [subtitle, setSubtitle] = useState(props.subtitle);
  const [ownerName, setOwnerName] = useState(props.ownerName);
  const [transparency, setTransparency] = useState(props.transparency);
  const [strictness, setStrictness] = useState(props.strictness);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    if (busy) return;
    setError(null);
    setMessage(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/capsules/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          ownerName,
          transparency,
          strictness,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      setMessage("已保存。");
      router.refresh();
    } catch {
      setError("网络出了点问题,请重试");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const okToDelete = window.confirm(
      "删除后,这个分享链接会立即失效,所有对话和待答问题也会一起删除。确定吗?",
    );
    if (!okToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/capsules/${props.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "删除失败");
        setDeleting(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("网络出了点问题,请重试");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="s-title">标题</label>
        <input
          id="s-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="s-subtitle">一句话说明</label>
        <input
          id="s-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          maxLength={160}
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="s-owner">你的称呼</label>
        <input
          id="s-owner"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          maxLength={40}
          placeholder="超纲时会说“已转给 XX 本人”"
          className="field"
        />
      </div>

      <div>
        <label className="label" htmlFor="s-transparency">它怎么介绍自己</label>
        <select
          id="s-transparency"
          value={transparency}
          onChange={(e) => setTransparency(e.target.value)}
          className="field"
        >
          <option value="persona">以我的名义:第一人称,像本人回复</option>
          <option value="assistant">助理:以助理身份出现</option>
          <option value="transparent">透明:说明是 AI 代表</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="s-strictness">拿不准时</label>
        <select
          id="s-strictness"
          value={strictness}
          onChange={(e) => setStrictness(e.target.value)}
          className="field"
        >
          <option value="high">严格:拿不准就转给我</option>
          <option value="medium">宽松:明显超纲才转</option>
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-primary flex-1 py-2.5 text-[13px]"
        >
          {busy ? "保存中…" : "保存设置"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting || busy}
          className="rounded-xl border border-rose-200 px-3 py-2.5 text-[12.5px] text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
        >
          {deleting ? "删除中…" : "删除"}
        </button>
      </div>
    </div>
  );
}
