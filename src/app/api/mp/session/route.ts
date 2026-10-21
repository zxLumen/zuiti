import { fail, ok } from "@/lib/api";
import { exchangeWxCode, upsertMpUser } from "@/lib/mp";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const devOpenid =
    typeof body.devOpenid === "string" ? body.devOpenid.trim().slice(0, 80) : "";

  const devMode =
    process.env.MP_DEV_MODE === "true" || process.env.NODE_ENV !== "production";

  let openid: string;

  try {
    if (devOpenid && devMode && !process.env.WX_MP_SECRET) {
      openid = `dev:${devOpenid}`;
    } else {
      if (!code) return fail("缺少登录 code");
      openid = await exchangeWxCode(code);
    }
  } catch (error) {
    console.error("[mp/session] 登录失败", error);
    return fail(error instanceof Error ? error.message : "微信登录失败", 401);
  }

  const user = await upsertMpUser(openid);
  return ok({ token: user.token, openid: user.openid });
}
