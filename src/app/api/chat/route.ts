import { prisma } from "@/lib/db";
import { clampText, fail, ok } from "@/lib/api";
import { ChatServiceError, getChatState, sendChatMessage } from "@/lib/chat-service";
import { baseUrlFromRequest } from "@/lib/url";

/**
 * 好友链接的 visitorId 形如 contact:<token>。
 * 用 token(而不是可猜的 id)来绑定,避免猜 id 读到别人的对话。
 */
async function resolveContact(capsuleId: string, visitorId: string) {
  if (!visitorId.startsWith("contact:")) return null;
  const rawToken = visitorId.slice("contact:".length);
  if (!rawToken) return null;

  return prisma.contact.findFirst({
    where: { token: rawToken, capsuleId },
    select: { id: true, name: true },
  });
}

function handleError(error: unknown) {
  if (error instanceof ChatServiceError) {
    return fail(error.message, error.status);
  }
  console.error("[chat] unexpected", error);
  return fail("出了点问题,请稍后再试", 500);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const visitorId = searchParams.get("visitorId");

  if (!token || !visitorId) return fail("参数不完整");

  try {
    const capsule = await prisma.capsule.findUnique({
      where: { shareToken: token },
      select: { id: true },
    });
    if (!capsule) return fail("这个嘴替不存在或已失效", 404);

    const contact = await resolveContact(capsule.id, visitorId);
    if (contact) {
      void prisma.contact
        .update({ where: { id: contact.id }, data: { lastActiveAt: new Date() } })
        .catch(() => {});
    }

    const state = await getChatState(capsule.id, visitorId);
    return ok(state);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const token = typeof body.token === "string" ? body.token : "";
  const visitorId = typeof body.visitorId === "string" ? body.visitorId.slice(0, 120) : "";
  const visitorLabel = clampText(body.visitorLabel, 30);
  const content = clampText(body.content, 2000);

  if (!token || !visitorId) return fail("参数不完整");
  if (content.length < 1) return fail("说点什么吧");

  try {
    const capsule = await prisma.capsule.findUnique({
      where: { shareToken: token },
      select: { id: true },
    });
    if (!capsule) return fail("这个嘴替不存在或已失效", 404);

    const contact = await resolveContact(capsule.id, visitorId);
    if (contact) {
      void prisma.contact
        .update({ where: { id: contact.id }, data: { lastActiveAt: new Date() } })
        .catch(() => {});
    }

    const result = await sendChatMessage({
      capsuleId: capsule.id,
      visitorId,
      visitorLabel: contact?.name ?? (visitorLabel || null),
      contactId: contact?.id ?? null,
      content,
      baseUrl: baseUrlFromRequest(req),
    });

    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
