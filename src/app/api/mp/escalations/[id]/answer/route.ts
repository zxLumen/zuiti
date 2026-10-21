import { clampText, fail, ok } from "@/lib/api";
import { getMpOwner } from "@/lib/mp";
import { EscalationError, answerEscalation } from "@/lib/escalation-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const answer = clampText(body.answer, 5000);
  if (answer.length < 1) return fail("先写点回答吧");

  try {
    await answerEscalation({ escalationId: id, ownerId: user.id, answer });
    return ok({});
  } catch (error) {
    if (error instanceof EscalationError) {
      return fail(error.message, error.status);
    }
    console.error("[mp/escalation] answer failed", error);
    return fail("出了点问题,请稍后再试", 500);
  }
}
