import { prisma } from "./db";
import { parseLearnedQA } from "./knowledge";

export class EscalationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function answerEscalation(input: {
  escalationId: string;
  ownerId: string;
  answer: string;
}) {
  const escalation = await prisma.escalation.findUnique({
    where: { id: input.escalationId },
    include: { capsule: true },
  });

  if (!escalation || escalation.capsule.ownerId !== input.ownerId) {
    throw new EscalationError("找不到这个问题", 404);
  }
  if (escalation.status !== "pending") {
    throw new EscalationError("这个问题已经处理过了", 409);
  }

  const learned = parseLearnedQA(escalation.capsule.learnedQA);
  learned.push({
    q: escalation.question,
    a: input.answer,
    at: new Date().toISOString(),
  });

  await prisma.$transaction([
    prisma.escalation.update({
      where: { id: escalation.id },
      data: { status: "answered", answer: input.answer, answeredAt: new Date() },
    }),
    prisma.message.create({
      data: {
        threadId: escalation.threadId,
        role: "owner",
        content: input.answer,
      },
    }),
    prisma.capsule.update({
      where: { id: escalation.capsuleId },
      data: { learnedQA: JSON.stringify(learned.slice(-50)) },
    }),
    prisma.thread.update({
      where: { id: escalation.threadId },
      data: { lastActiveAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}
