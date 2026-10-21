import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function emailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string) {
  if (!emailConfigured()) return false;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || `嘴替 <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("[mail] send failed", error);
    return false;
  }
}

export function sendLoginCode(email: string, code: string) {
  return send(
    email,
    "嘴替 · 登录验证码",
    `<div style="font-family:system-ui,sans-serif;line-height:1.7;color:#1c1917">
      <p>你的登录验证码是:</p>
      <p style="font-size:30px;letter-spacing:6px;font-weight:700">${code}</p>
      <p style="color:#78716c">10 分钟内有效。如果不是你本人操作,忽略这封邮件即可。</p>
    </div>`,
  );
}

export function sendEscalationNotice(
  email: string,
  capsuleTitle: string,
  question: string,
  dashboardUrl: string,
) {
  return send(
    email,
    `嘴替 · 「${capsuleTitle}」有一个问题等你回答`,
    `<div style="font-family:system-ui,sans-serif;line-height:1.7;color:#1c1917">
      <p>有人在「${capsuleTitle}」这个嘴替里问了一个超出材料范围的问题:</p>
      <blockquote style="margin:16px 0;padding:12px 16px;background:#f7f4ee;border-left:3px solid #d97706">
        ${escapeHtml(question)}
      </blockquote>
      <p><a href="${dashboardUrl}" style="color:#b45309">去回答这个问题</a></p>
      <p style="color:#78716c">你回答后,对方会立即看到,而且这个答案会沉淀进这个嘴替,下次同类问题它会自己回答。</p>
    </div>`,
  );
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
