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
  const contact = await prisma.contact.findUnique({
    where: { token },
    select: {
      name: true,
      capsule: {
        select: { title: true, subtitle: true, ownerName: true, transparency: true },
      },
    },
  });

  if (!contact) return { title: "嘴替", robots: { index: false, follow: false } };

  const persona = contact.capsule.transparency === "persona";
  const title = persona
    ? contact.capsule.ownerName?.trim() || contact.name
    : `${contact.capsule.title} · 嘴替`;
  const description = contact.capsule.subtitle ?? (persona ? "直接问我" : "一个可以对话的代表");

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  };
}

export default async function FriendPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const contact = await prisma.contact.findUnique({
    where: { token },
    select: {
      token: true,
      name: true,
      capsule: {
        select: {
          shareToken: true,
          title: true,
          subtitle: true,
          ownerName: true,
          transparency: true,
          knowledge: true,
        },
      },
    },
  });

  if (!contact) notFound();

  const suggestions = parseKnowledge(contact.capsule.knowledge)
    .faq.slice(0, 3)
    .map((item) => item.q);

  return (
    <ChatRoom
      token={contact.capsule.shareToken}
      title={contact.capsule.title}
      subtitle={contact.capsule.subtitle}
      ownerName={contact.capsule.ownerName}
      transparency={contact.capsule.transparency}
      demo={!process.env.LLM_API_KEY}
      suggestions={suggestions}
      fixedVisitorId={`contact:${contact.token}`}
      visitorLabel={contact.name}
    />
  );
}
