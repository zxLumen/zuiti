import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/chat-room";
import { prisma } from "@/lib/db";
import { parseKnowledge } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const capsule = await prisma.capsule.findUnique({
    where: { shareToken: token },
    select: { title: true, subtitle: true, ownerName: true, transparency: true },
  });

  const persona = capsule?.transparency === "persona";
  const title = capsule
    ? persona
      ? capsule.ownerName?.trim() || capsule.title
      : `${capsule.title} · 嘴替`
    : "嘴替";
  const description = capsule?.subtitle ?? (persona ? "直接问我" : "一个可以对话的代表");

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  };
}

export default async function PublicCapsulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const capsule = await prisma.capsule.findUnique({
    where: { shareToken: token },
    select: {
      title: true,
      subtitle: true,
      ownerName: true,
      transparency: true,
      knowledge: true,
    },
  });

  if (!capsule) notFound();

  const suggestions = parseKnowledge(capsule.knowledge)
    .faq.slice(0, 3)
    .map((item) => item.q);

  return (
    <ChatRoom
      token={token}
      title={capsule.title}
      subtitle={capsule.subtitle}
      ownerName={capsule.ownerName}
      transparency={capsule.transparency}
      demo={!process.env.LLM_API_KEY}
      suggestions={suggestions}
    />
  );
}
