"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EscalationCard({
  id,
  question,
  reason,
  createdAt,
  visitorLabel,
}: {
  id: string;
  question: string;
  reason: string | null;
  createdAt: string;
  visitorLabel: string;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<"answer" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    if (answer.trim().length < 1) {
      setError("先写点回答吧");
      return;
    }
    setError(null);
    setBusy("answer");
    try {
      const res = await fetch(`/api/escalations/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "提交失败");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError("网络出了点问题,请重试");
      setBusy(null);
    }
  }

  async function dismiss() {
    if (busy) return;
    const okToDismiss = window.confirm(
      "忽略后,对方会收到「暂时无法回答,建议直接联系本人」,并且这个问题不再出现在你的待答列表。确定吗?",
    );
    if (!okToDismiss) return;

    setError(null);
    setBusy("dismiss");
    try {
      const res = await fetch(`/api/escalations/${id}/dismiss`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "操作失败");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError("网络出了点问题,请重试");
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-amber-800">
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="font-medium">{visitorLabel}</span>
          <span className="text-amber-700/50">·</span>
          <span className="text-amber-700/80">{createdAt}</span>
        </div>
        {reason && (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] text-amber-800/80 ring-1 ring-amber-600/10">
            超纲原因:{reason}
          </span>
        )}
      </div>

      <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] font-medium leading-6 text-stone-900">
        {question}
      </p>

      <div className="mt-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          placeholder="写下你的回答。回复后对方会立刻看到,而且会沉淀进这个嘴替。"
          className="field resize-y bg-white text-[13px] leading-6"
        />
      </div>

      {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-stone-500">
          回答会同时发送给对方,并让这个嘴替学会它。
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={dismiss}
            className="rounded-lg px-2.5 py-1.5 text-[12px] text-stone-500 transition hover:text-stone-800 disabled:opacity-50"
          >
            {busy === "dismiss" ? "处理中…" : "忽略"}
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={submit}
            className="rounded-lg bg-stone-900 px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
          >
            {busy === "answer" ? "发送中…" : "回复并沉淀"}
          </button>
        </div>
      </div>
    </div>
  );
}
