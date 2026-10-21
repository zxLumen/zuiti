import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "登录 · 嘴替" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { next } = await searchParams;
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="blob animate-breathe left-[-15%] top-[-12%] h-[380px] w-[380px] bg-amber-200/60" />
      <div className="blob right-[-12%] top-[20%] h-[320px] w-[320px] bg-rose-200/40 [animation-delay:-5s]" />
      <div className="paper-grid absolute inset-0 opacity-40" />

      <SiteHeader />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-20 pt-10 sm:pt-16">
        <LoginForm next={target} />
      </main>
    </div>
  );
}
