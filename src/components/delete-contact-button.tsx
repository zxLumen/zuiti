"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteContactButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        const confirmed = window.confirm(
          `删除「${name}」后,这条专属链接会立即失效,对方也无法再打开。对话记录会保留在对应的嘴替里。确定吗?`,
        );
        if (!confirmed) return;
        setBusy(true);
        try {
          const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.ok) router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="text-[11.5px] text-stone-400 transition hover:text-rose-600 disabled:opacity-50"
    >
      {busy ? "删除中…" : "删除"}
    </button>
  );
}
