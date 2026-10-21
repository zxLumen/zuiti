"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ThreadLabelEditor({
  threadId,
  label,
}: {
  threadId: string;
  label: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/threads/${threadId}/label`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "保存失败");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("网络出了点问题,请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50/70 px-2.5 py-1.5">
      <span className="text-[10.5px] text-stone-400">备注</span>

      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={30}
            autoFocus
            placeholder="例如:王总"
            className="h-7 min-w-[120px] flex-1 rounded-md border border-stone-200 bg-white px-2 text-[11.5px] text-stone-800 outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-md bg-stone-900 px-2.5 py-1 text-[10.5px] font-medium text-white disabled:opacity-50"
          >
            {busy ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(label);
              setError(null);
            }}
            className="text-[10.5px] text-stone-500"
          >
            取消
          </button>
        </>
      ) : (
        <>
          <span className="text-[11.5px] font-medium text-stone-700">
            {label || "未命名"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10.5px] text-amber-700 transition hover:text-amber-900"
          >
            修改
          </button>
        </>
      )}

      {error && <span className="text-[10px] text-rose-600">{error}</span>}
    </div>
  );
}
