import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { PasswordSettings } from "@/components/password-settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "设置 · 嘴替" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, passwordHash: true },
  });
  if (!dbUser) redirect("/login");

  const hasPassword = Boolean(dbUser.passwordHash);

  return (
    <div className="relative min-h-screen">
      <div className="blob left-[-14%] top-[-14%] h-[340px] w-[340px] bg-amber-200/40" />
      <div className="paper-grid absolute inset-0 opacity-30" />

      <header className="relative z-10 border-b border-stone-200/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-5">
            <Logo href="/dashboard" />
            <nav className="flex items-center gap-1 text-[12px] sm:text-[12.5px]">
              <Link
                href="/dashboard"
                className="rounded-lg px-2 py-1.5 text-stone-500 transition hover:bg-white/70 hover:text-stone-900"
              >
                我的嘴替
              </Link>
              <Link
                href="/dashboard/contacts"
                className="rounded-lg px-2 py-1.5 text-stone-500 transition hover:bg-white/70 hover:text-stone-900"
              >
                好友绑定
              </Link>
              <span className="rounded-lg bg-white px-2 py-1.5 font-medium text-stone-900 ring-1 ring-stone-200">
                设置
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-[12.5px]">
            <span className="hidden max-w-[180px] truncate text-[12px] text-stone-500 sm:block">
              {dbUser.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-24 pt-9 sm:px-8">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          Account
        </p>
        <h1 className="mt-1.5 text-[1.85rem] font-bold tracking-tight text-stone-900">
          账号设置
        </h1>
        <p className="mt-1.5 text-[13px] leading-6 text-stone-500">
          网页控制台和小程序主人入口使用同一个邮箱 + 密码。
        </p>

        <section className="card mt-6 p-6">
          <h2 className="text-[15px] font-semibold text-stone-900">登录邮箱</h2>
          <p className="mt-2 text-[13px] text-stone-600">{dbUser.email}</p>
          <p className="mt-1 text-[11.5px] leading-5 text-stone-400">
            邮箱用于登录和找回密码。验证码登录仍然可用。
          </p>
        </section>

        <section className="card mt-4 p-6">
          <h2 className="text-[15px] font-semibold text-stone-900">
            {hasPassword ? "修改密码" : "设置密码"}
          </h2>
          <p className="mt-1.5 text-[12px] leading-5 text-stone-500">
            {hasPassword
              ? "修改后,网页和小程序下次登录都用新密码。"
              : "设置后,可以用邮箱 + 密码登录;小程序主人入口也需要这个密码。"}
          </p>
          <div className="mt-4">
            <PasswordSettings hasPassword={hasPassword} />
          </div>
        </section>

        <section className="card mt-4 p-6">
          <h2 className="text-[15px] font-semibold text-stone-900">小程序主人登录</h2>
          <p className="mt-2 text-[12.5px] leading-6 text-stone-500">
            小程序不再使用 6 位登录码。主人入口直接输入上面的邮箱和密码。
            如果还没设置密码,先在这里设置。
          </p>
        </section>
      </main>
    </div>
  );
}
