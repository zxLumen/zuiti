import { prisma } from "@/lib/db";
import { clampText, fail, ok } from "@/lib/api";
import { ChatServiceError, getChatState, sendChatMessage } from "@/lib/chat-service";
import { getMpVisitor, shortOpenId } from "@/lib/mp";
import { baseUrlFromRequest } from "@/lib/url";

function handleError(error: unknown) {
  if (error instanceof ChatServiceError) {
    return fail(error.message, error.status);
  }
  console.error("[mp/chat] unexpected", error);
  return fail("出了点问题,请稍后再试", 500);
}

async function resolveCapsuleId(shareToken: string) {
  const capsule = await prisma.capsule.findUnique({
    where: { shareToken },
    select: { id: true },
  });
  return capsule?.id ?? null;
}

async function resolveContact(capsuleId: string, token: string) {
  if (!token) return null;
  return prisma.contact.findFirst({
    where: { token, capsuleId },
    select: { id: true, name: true },
  });
}

export async function GET(req: Request) {
  const visitor = await getMpVisitor(req);
  if (!visitor) return fail("请先进入小程序", 401);

  const { searchParams } = new URL(req.url);
  const capsuleToken = searchParams.get("capsuleToken");
  if (!capsuleToken) return fail("参数不完整");

  try {
    const capsuleId = await resolveCapsuleId(capsuleToken);
    if (!capsuleId) return fail("这个嘴替不存在或已失效", 404);

    const state = await getChatState(capsuleId, `mp:${visitor.openid}`);
    return ok(state);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  const visitor = await getMpVisitor(req);
  if (!visitor) return fail("请先进入小程序", 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const capsuleToken =
    typeof body.capsuleToken === "string" ? body.capsuleToken : "";
  const contactToken =
    typeof body.contactToken === "string" ? body.contactToken : "";
  const content = clampText(body.content, 2000);

  if (!capsuleToken) return fail("参数不完整");
  if (content.length < 1) return fail("说点什么吧");

  try {
    const capsuleId = await resolveCapsuleId(capsuleToken);
    if (!capsuleId) return fail("这个嘴替不存在或已失效", 404);

    const contact = await resolveContact(capsuleId, contactToken);

    const result = await sendChatMessage({
      capsuleId,
      visitorId: `mp:${visitor.openid}`,
      visitorLabel: contact?.name || `微信好友 ${shortOpenId(visitor.openid)}`,
      contactId: contact?.id ?? null,
      content,
      baseUrl: baseUrlFromRequest(req),
    });

    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
