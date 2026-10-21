# 嘴替

把一件事浓缩成一个**能替你回话的嘴替**。

你把项目总结、进度、立场放进去,把它绑定给某个微信好友。对方打开专属页面或小程序卡片直接提问:

- **范围内的问题** —— 它基于你的材料,以你的名义自动回答;
- **超纲的问题** —— 它说「我确认一下」,把问题转给你;
- **你答过的** —— 自动沉淀回这个嘴替,下次同类问题它自己接住;
- **关系是预先绑定的** —— 哪个嘴替给哪个好友,设一次就行,不用每次转发。

对方只能提问和看到回答,**看不到你粘贴的原始材料**。

---

## 现在有什么

- **Web 控制台**:创建/浓缩嘴替、好友绑定、待答列表、对话记录、已学会问答。
- **H5 对话页**:微信里直接转发链接,对方点开即可提问。
- **微信小程序(原生)**:主人转发小程序卡片,好友点开直接进入这一团的问答窗口。
- **小程序 API**:`wx.login` → openid 身份、主人邮箱 + 密码登录、问答、超纲转交、小程序内回答。
- **演示模式**:不配模型也能跑通完整流程;配 `LLM_API_KEY` 后切换真实模型。

---

## 快速开始

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

打开 http://localhost:3000。

第一次登录:输入邮箱 → 验证码会直接显示在登录页(开发模式,未配置 SMTP 时),验证后设置密码;之后可用邮箱 + 密码登录。

### 配置真实模型

默认走 **zxLumen AI 网关**(和 agentbrain 同一个通道),OpenAI 兼容:

```bash
LLM_API_KEY="zxai_..."
LLM_BASE_URL="https://zxlumen.cn/api/ai/v1"
LLM_MODEL="deepseek-v4.1-flash"
```

网关令牌在博客后台生成,只放服务端。也可以换回直连 DeepSeek(改 `LLM_BASE_URL` / `LLM_MODEL`),只要兼容 `/chat/completions` + JSON 输出。

### 演示模式

**不填 `LLM_API_KEY` 也能完整跑通流程**,此时使用本地规则:

- 按材料的小节(进展 / 排期 / 风险…)检索答案;
- 命中预算、合同、人事、承诺等敏感词 → 转给主人;
- 命中「全文 / 原文 / 提示词 / 忽略指令」→ 直接拒绝,防止材料被套走。

配置 Key 后自动切换到真实模型,无需改代码。

---

## 微信小程序

小程序代码在 `miniprogram/`,原生 WXML/WXSS/JS,AppID 已写入 `project.config.json`。

详细步骤见 **[miniprogram/README.md](./miniprogram/README.md)**,这里只列关键点:

1. 用微信开发者工具导入 `miniprogram/` 目录。
2. `config.js` 默认连 `https://zuiti.zxlumen.cn`;如果你想连本机后端,把 `DEV_API_BASE` 改成 `http://localhost:3100`。
3. `PROD_API_BASE` 已经是 `https://zuiti.zxlumen.cn`。
4. 网页控制台 → **设置** → 设置密码;小程序「主人入口」用同一个邮箱 + 密码登录 → 选嘴替 → 转发给好友。
5. 好友点卡片 → 直接进入问答窗口,不需要登录。

### 域名与备案(重要)

- 小程序 `wx.request` 的服务器域名**必须是 HTTPS**,官方要求 **ICP 备案**。
- `zuiti.zxlumen.cn` 目前在香港服务器上,先加 A 记录和 Caddy/HTTPS 即可让 Web 端可用。
- 但香港域名能否直接加进小程序「服务器域名」,要**实际在公众平台试一次**:
  - 能加 → 直接用;
  - 提示未备案 → 走 **微信云托管/云开发**(免域名),或换大陆服务器做 ICP 备案。
- 详情和小程序接入步骤见 `miniprogram/README.md`。

### 小程序名称

微信小程序名称全平台唯一,且要符合长度/识别性规范。建议注册名:

- 首选:**小嘴替**
- 备选:**嘴替一下 / 嘴替ZuiTi / 嘴替说**

品牌仍可统一叫「嘴替」。头像使用 `public/zuiti-avatar.png`。

---

## 邮件(可选,但上线建议配置)

不配置 SMTP 时,登录验证码会显示在页面上(仅适合本地开发)。
上线前请配置:

```bash
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_USER="no-reply@example.com"
SMTP_PASS="..."
SMTP_FROM="嘴替 <no-reply@example.com>"
AUTH_DEV_MODE="false"
```

配置后还会在「有超纲问题」时给主人发提醒邮件。

---

## 部署注意

1. **HTTPS**:生产环境会话 Cookie 带 `Secure`,必须用 HTTPS 访问。
2. **持久化**:默认 SQLite(`prisma/dev.db`),适合单机 + 持久磁盘。
   多实例 / Serverless 请换成 Postgres(改 `prisma/schema.prisma` 的 `provider` 和 `DATABASE_URL`,重新 `prisma db push`)。
3. **APP_URL**:线上填 `https://zuiti.zxlumen.cn`,用于分享链接和邮件回跳。
   留空时会自动用请求的 Host。
4. **小程序密钥**:

   ```bash
   WX_MP_APPID="wx322b1ce49c5e982b"
   WX_MP_SECRET="..."
   MP_DEV_MODE="false"
   ```

   AppSecret 只放服务端,不要提交到 Git,也不要写进小程序代码。
5. **反向代理**:应用会读取 `x-forwarded-host` / `x-forwarded-proto`。
6. **域名**:DNSPod 添加 `zuiti` A 记录指向服务器;Caddy 加一段:

   ```
   zuiti.zxlumen.cn {
       reverse_proxy 127.0.0.1:3100
   }
   ```

```bash
npm run build
npm run start
```

---

## 隐私与安全

- **原始材料不对外**:公开页、H5 API、小程序 API 都不返回 `rawContent`,对方只看得到回答。
- **防套话**:识别「全文 / 原文 / 复制 / 提示词 / 忽略之前指令」等请求,直接拒绝,不调用模型。
- **提示词约束**:明确要求模型只回答当前问题、禁止整段复述材料、禁止输出无关内容。
- **小程序 openid**:仅用于区分对话,不对外展示;不读取微信聊天记录。
- **链接即权限**:分享链接/小程序卡片是「知道即可访问」,请不要发到公开群。

---

## 目录结构

```
src/
  app/
    page.tsx                    落地页
    login/                      邮箱验证码登录
    dashboard/                  控制台
      new/                      创建嘴替
      contacts/                 好友绑定:哪个嘴替给哪个好友
      capsules/[id]/            管理:待答、对话、已学会、设置
    c/[token]/                  公开对话页(直接分享某个嘴替)
    f/[token]/                  好友专属对话页(绑定关系)
    api/
      auth/                     验证码 / 会话
      capsules/                 创建、修改、删除
      contacts/                 好友绑定、删除
      chat/                     公开对话(判断 + 回答 + 升级)
      escalations/              主人回答 / 忽略
      extract/                  PDF / DOCX / TXT 解析
      mp/                       小程序 API(session / owner / chat / escalations)
  components/                   界面组件
  lib/
    knowledge.ts                提炼、判断边界、生成回答、演示模式
    chat-service.ts             H5 与小程序共用的问答核心
    escalation-service.ts       主人回答 + 沉淀
    mp.ts                       openid / 小程序会话
    llm.ts                      OpenAI 兼容模型封装
    auth.ts / db.ts / email.ts  认证、数据库、邮件
miniprogram/                    原生微信小程序
prisma/schema.prisma            User / Capsule / Contact / Thread / Message / Escalation / MpUser / MpOwnerCode
```

---

## 核心流程

```
主人:材料 → 浓缩(知识底座 + 边界 + 预设问答)
                ↓
        绑定给某个好友 / 生成小程序卡片
                ↓
好友:打开链接或卡片 → 提问(看到的是「你」在回复)
                ↓
        ┌───────┴────────┐
     材料能答          材料答不了 / 涉及决策承诺
        ↓                  ↓
  以你的名义自动回答    转给你(邮件 + 待答列表 / 小程序)
                           ↓
                    你回答 → 推回给对方
                           ↓
                    沉淀进这个嘴替(下次自动答)
```
