import { prisma } from "./db";
import {
  generateReply,
  parseKnowledge,
  parseLearnedQA,
  type ReplyDecision,
} from "./knowledge";
import { sendEscalationNotice } from "./email";

export class ChatServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function publicCapsule(capsule: {
  title: string;
  subtitle: string | null;
  ownerName: string | null;
  transparency: string;
  knowledge: string;
}) {
  const knowledge = parseKnowledge(capsule.knowledge);
  return {
    title: capsule.title,
    subtitle: capsule.subtitle,
    ownerName: capsule.ownerName,
    transparency: capsule.transparency,
    demo: !process.env.LLM_API_KEY,
    suggestions: knowledge.faq.slice(0, 3).map((item) => item.q),
  };
}

function mapMessage(message: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };
}

export async function getChatState(capsuleId: string, visitorId: string) {
  const capsule = await prisma.capsule.findUnique({
    where: { id: capsuleId },
    select: {
      title: true,
      subtitle: true,
      ownerName: true,
      transparency: true,
      knowledge: true,
    },
  });

  if (!capsule) {
    throw new ChatServiceError("这个嘴替不存在或已失效", 404);
  }

  const thread = await prisma.thread.findUnique({
    where: { capsuleId_visitorId: { capsuleId, visitorId } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const pending = thread
    ? await prisma.escalation.count({
        where: { threadId: thread.id, status: "pending" },
      })
    : 0;

  return {
    capsule: publicCapsule(capsule),
    threadId: thread?.id ?? null,
    pending,
    messages: (thread?.messages ?? []).map(mapMessage),
  };
}

export async function sendChatMessage(input: {
  capsuleId: string;
  visitorId: string;
  visitorLabel?: string | null;
  contactId?: string | null;
  content: string;
  baseUrl: string;
}) {
  const capsule = await prisma.capsule.findUnique({
    where: { id: input.capsuleId },
    include: { owner: true },
  });

  if (!capsule) {
    throw new ChatServiceError("这个嘴替不存在或已失效", 404);
  }

  const thread = await prisma.thread.upsert({
    where: {
      capsuleId_visitorId: {
        capsuleId: capsule.id,
        visitorId: input.visitorId,
      },
    },
    update: {
      lastActiveAt: new Date(),
      ...(input.contactId
        ? {
            contactId: input.contactId,
            visitorLabel: input.visitorLabel ?? undefined,
          }
        : {}),
    },
    create: {
      capsuleId: capsule.id,
      visitorId: input.visitorId,
      visitorLabel: input.visitorLabel || null,
      contactId: input.contactId || null,
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const recentVisitorMessages = await prisma.message.count({
    where: {
      threadId: thread.id,
      role: "visitor",
      createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recentVisitorMessages >= 30) {
    throw new ChatServiceError("问得有点快,休息一下再问吧", 429);
  }

  const history = thread.messages.slice(-14);

  const visitorMessage = await prisma.message.create({
    data: { threadId: thread.id, role: "visitor", content: input.content },
  });

  let reply: ReplyDecision;
  try {
    reply = await generateReply({
      capsule: {
        id: capsule.id,
        title: capsule.title,
        subtitle: capsule.subtitle,
        ownerName: capsule.ownerName,
        rawContent: capsule.rawContent,
        knowledge: parseKnowledge(capsule.knowledge),
        transparency: capsule.transparency,
        strictness: capsule.strictness,
      },
      learnedQA: parseLearnedQA(capsule.learnedQA),
      history: history.map((m) => ({ role: m.role, content: m.content })),
      question: input.content,
    });
  } catch (error) {
    console.error("[chat] 生成回复失败", error);
    const assistantMessage = await prisma.message.create({
      data: {
        threadId: thread.id,
        role: "assistant",
        content: "模型通道暂时不可用,请稍后再试,或直接联系本人。",
      },
    });

    return {
      messages: [visitorMessage, assistantMessage].map(mapMessage),
      escalated: false,
      pending: 0,
    };
  }

  const assistantMessage = await prisma.message.create({
    data: {
      threadId: thread.id,
      role: "assistant",
      content: reply.answer,
    },
  });

  let escalated = false;

  if (reply.decision === "escalate") {
    const existing = await prisma.escalation.findFirst({
      where: {
        threadId: thread.id,
        question: input.content,
        status: "pending",
      },
    });

    if (!existing) {
      await prisma.escalation.create({
        data: {
          capsuleId: capsule.id,
          threadId: thread.id,
          question: input.content,
          reason: reply.reason ?? null,
        },
      });
      escalated = true;

      const dashboardUrl = `${input.baseUrl}/dashboard/capsules/${capsule.id}`;
      void sendEscalationNotice(
        capsule.owner.email,
        capsule.title,
        input.content,
        dashboardUrl,
      );
    }
  }

  await prisma.thread.update({
    where: { id: thread.id },
    data: { lastActiveAt: new Date() },
  });

  const pending = await prisma.escalation.count({
    where: { threadId: thread.id, status: "pending" },
  });

  return {
    messages: [visitorMessage, assistantMessage].map(mapMessage),
    escalated,
    pending,
  };
}
