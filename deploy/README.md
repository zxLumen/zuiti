# 部署到 zuiti.zxlumen.cn

## 1. DNS

在 DNSPod 给 `zxlumen.cn` 添加记录:

| 类型 | 主机 | 值 | TTL |
|---|---|---|---|
| A | zuiti | 103.205.240.62 | 600 |

## 2. Caddy

把 `deploy/Caddyfile.zuiti` 的内容并入服务器现有的 Caddyfile,或加一行:

```caddyfile
import /path/to/deploy/Caddyfile.zuiti
```

然后重载:

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

Caddy 会自动为 `zuiti.zxlumen.cn` 申请 Let's Encrypt 证书。

> **临时保护**:`/login` 和 `/api/auth/*` 目前加了 Caddy Basic Auth(账号 `admin`)。
> 密码在 Caddyfile 的 `basic_auth` 段,由部署时设置;当前是演示密码,对外分享前请更换。
> 配置好 SMTP(能正常收验证码)后,把这段 `basic_auth` 去掉即可。
> 聊天页 `/c/*`、`/f/*` 和小程序 API `/api/mp/*` 不受 Basic Auth 影响。

## 3. 运行应用

```bash
cd /path/to/zuiti
npm install
npx prisma db push
npm run build
PORT=3100 npm run start
```

生产环境 `.env`:

```bash
APP_URL="https://zuiti.zxlumen.cn"
WX_MP_APPID="wx322b1ce49c5e982b"
WX_MP_SECRET="..."
MP_DEV_MODE="false"
AUTH_DEV_MODE="false"
```

### 3.1 邮件（登录验证码）

应用通过 nodemailer 走 **Resend SMTP** 发信（无需自建邮件服务器）：

```bash
SMTP_HOST="smtp.resend.com"
SMTP_PORT="465"          # 465=隐式 TLS，代码里 secure 自动为 true
SMTP_USER="resend"       # 固定值
SMTP_PASS="<RESEND_API_KEY>"
SMTP_FROM="嘴替 <no-reply@zxlumen.cn>"
```

- 发件域名 `zxlumen.cn` 已在 Resend 验证；
- 域名的 DMARC 是 `p=reject`，所以 `resend._domainkey` 等 DNS 记录不能删；
- 配置好后可用 `src/lib/email.ts` 的 `emailConfigured()` 判断是否生效。

## 4. 验证

```bash
curl -I https://zuiti.zxlumen.cn
curl -s https://zuiti.zxlumen.cn/api/mp/session -X POST \
  -H 'Content-Type: application/json' -d '{}'
```

## 5. 小程序服务器域名

小程序后台 → 开发管理 → 开发设置 → 服务器域名 → request 合法域名:

```
https://zuiti.zxlumen.cn
```

如果提示域名未备案,见 `../miniprogram/README.md` 的「域名与备案」。
