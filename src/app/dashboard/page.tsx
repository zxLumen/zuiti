import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { CopyLink } from "@/components/copy-link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";

export const metadata = { title: "控制台 · 嘴替" };
export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const capsules = await prisma.capsule.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { threads: true } },
      escalations: { where: { status: "pending" }, select: { id: true } },
    },
  });

  const base = await getBaseUrl();
  const pendingTotal = capsules.reduce((sum, c) => sum + c.escalations.length, 0);
  const threadTotal = capsules.reduce((sum, c) => sum + c._count.threads, 0);
  const demo = !process.env.LLM_API_KEY;

  return (
    <div className="relative min-h-screen">
      <div className="blob left-[-14%] top-[-14%] h-[360px] w-[360px] bg-amber-200/50" />
      <div className="paper-grid absolute inset-0 opacity-30" />

      <header className="relative z-10 border-b border-stone-200/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-5">
            <Logo href="/dashboard" />
            <nav className="flex items-center gap-1 text-[12px] sm:text-[12.5px]">
              <span className="rounded-lg bg-white px-2 py-1.5 font-medium text-stone-900 ring-1 ring-stone-200">
                我的嘴替
              </span>
              <Link
                href="/dashboard/contacts"
                className="rounded-lg px-2 py-1.5 text-stone-500 transition hover:bg-white/70 hover:text-stone-900"
              >
                好友绑定
              </Link>
              <Link
                href="/dashboard/settings"
                className="rounded-lg px-2 py-1.5 text-stone-500 transition hover:bg-white/70 hover:text-stone-900"
              >
                设置
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[180px] truncate text-[12px] text-stone-500 sm:block">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 pt-9 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Your capsules
            </p>
            <h1 className="mt-1.5 text-[1.85rem] font-bold tracking-tight text-stone-900">
              我的嘴替
            </h1>
            <p className="mt-1.5 text-[13px] text-stone-500">
              每个嘴替代表一件事。把链接发出去,让它们替你开口。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/new" className="btn-primary px-4 py-2.5">
              <span aria-hidden className="text-[15px]">+</span>
              创建嘴替
            </Link>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3 sm:max-w-md">
          <div className="card px-4 py-3">
            <p className="text-[11px] text-stone-500">进行中的嘴替</p>
            <p className="mt-1 text-[1.35rem] font-bold text-stone-900">{capsules.length}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="text-[11px] text-stone-500">待回答</p>
            <p
              className={`mt-1 text-[1.35rem] font-bold ${
                pendingTotal > 0 ? "text-amber-700" : "text-stone-900"
              }`}
            >
              {pendingTotal}
            </p>
          </div>
          <div className="card px-4 py-3">
            <p className="text-[11px] text-stone-500">对话数</p>
            <p className="mt-1 text-[1.35rem] font-bold text-stone-900">{threadTotal}</p>
          </div>
        </div>

        {demo && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-[12.5px] leading-5 text-amber-900">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <p>
              <span className="font-semibold">演示模式</span>
              :还没有配置
              <code className="mx-1 rounded bg-white/70 px-1 py-0.5 font-mono text-[11.5px]">
                LLM_API_KEY
              </code>
              。当前用本地规则模拟“回答/超纲”,流程完全可跑;配置后自动切换到真实模型。
            </p>
          </div>
        )}

        {capsules.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white/40 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300">
              <span className="text-[18px] font-black text-white">替</span>
            </div>
            <h2 className="mt-5 text-[1.1rem] font-semibold text-stone-900">
              还没有嘴替。先从一个说不清的事开始。
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-stone-500">
              比如一份项目汇报、一个方案、一件你不想再解释第十遍的决定。
              把材料扔进来,它会帮你浓缩成一个能对话的代表。
            </p>
            <Link href="/dashboard/new" className="btn-primary mt-6 px-5 py-3">
              创建第一个嘴替
            </Link>
          </div>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capsules.map((capsule) => {
              const pending = capsule.escalations.length;
              const shareUrl = `${base}/c/${capsule.shareToken}`;

              return (
                <div key={capsule.id} className="card card-hover flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/dashboard/capsules/${capsule.id}`}
                      className="min-w-0 flex-1"
                    >
                      <h3 className="truncate text-[15.5px] font-semibold text-stone-900 transition hover:text-amber-800">
                        {capsule.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[12.5px] leading-5 text-stone-500">
                        {capsule.subtitle || "—"}
                      </p>
                    </Link>
                    {pending > 0 && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 ring-1 ring-amber-600/15">
                        {pending} 待答
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-[11.5px] text-stone-500">
                    <span>{capsule._count.threads} 个对话</span>
                    <span className="text-stone-300">·</span>
                    <span>更新于 {formatDate(capsule.updatedAt)}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-stone-100 pt-3.5">
                    <CopyLink value={shareUrl} />
                    <div className="flex items-center gap-2">
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11.5px] font-medium text-stone-500 transition hover:text-stone-900"
                      >
                        打开
                      </a>
                      <Link
                        href={`/dashboard/capsules/${capsule.id}`}
                        className="text-[11.5px] font-medium text-amber-700 transition hover:text-amber-900"
                      >
                        管理 →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link
              href="/dashboard/new"
              className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/30 text-stone-500 transition hover:border-amber-400 hover:bg-white/60 hover:text-amber-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-[18px]">
                +
              </span>
              <span className="text-[12.5px] font-medium">再建一个嘴替</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
