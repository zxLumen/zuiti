import Link from "next/link";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Logo />
      <nav className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link
              href="/dashboard"
              className="font-medium text-stone-600 transition hover:text-stone-900"
            >
              控制台
            </Link>
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 font-medium text-stone-600 transition hover:bg-white/70 hover:text-stone-900"
          >
            登录
          </Link>
        )}
      </nav>
    </header>
  );
}
