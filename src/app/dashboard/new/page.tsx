import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { NewCapsuleForm } from "@/components/new-capsule-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "创建嘴替" };
export const dynamic = "force-dynamic";

export default async function NewCapsulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/new");

  return (
    <div className="relative min-h-screen">
      <div className="blob left-[-14%] top-[-14%] h-[340px] w-[340px] bg-amber-200/50" />
      <div className="paper-grid absolute inset-0 opacity-30" />

      <header className="relative z-10 border-b border-stone-200/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-4 text-[12.5px]">
            <Link
              href="/dashboard"
              className="text-stone-500 transition hover:text-stone-900"
            >
              ← 返回控制台
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-24 pt-9 sm:px-8">
        <div className="mb-7">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            New capsule
          </p>
          <h1 className="mt-1.5 text-[1.85rem] font-bold tracking-tight text-stone-900">
            把一件事,交给嘴替
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-stone-500">
            你写得越完整,它越能替你挡住重复的问题。超纲的部分不会硬答 —— 它会来找你。
          </p>
        </div>

        <NewCapsuleForm
          demo={!process.env.LLM_API_KEY}
          defaultOwnerName={user.email.split("@")[0] ?? ""}
        />
      </main>
    </div>
  );
}
