# 嘴替 · 微信小程序

原生小程序端。好友点开卡片 → 直接进入某一团的问答窗口;主人从小程序里选团、转发、回答超纲问题。

## 1. 在开发者工具里打开

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 导入项目,目录选 **`miniprogram/`**(不是仓库根目录)。
3. AppID 已写在 `project.config.json`:`wx322b1ce49c5e982b`。
4. 本地开发勾选「不校验合法域名、TLS 版本及 HTTPS 证书」。

## 2. 后端地址

`config.js`:

```js
const PROD_API_BASE = "https://zuiti.zxlumen.cn";
// 默认直连线上后端,开发者和服务器不在同一台机器时也能用。
// 如果你想连本机后端,改成 http://localhost:3100,并在开发者工具勾选「不校验合法域名」。
const DEV_API_BASE = "https://zuiti.zxlumen.cn";
```

- 开发者工具模拟器:`develop` 环境用 `DEV_API_BASE`。
- 默认就是线上 `https://zuiti.zxlumen.cn`,所以不需要改配置也能直接联调。
- 如果你在本机跑后端,把 `DEV_API_BASE` 改成 `http://localhost:3100`(手机真机则用电脑局域网 IP)。
- 体验版/正式版自动用 `PROD_API_BASE`,需要在公众平台配置服务器域名。

后端启动:

```bash
cd ..
PORT=3100 npm run dev
# 或 npm run build && PORT=3100 npm run start
```

## 3. 登录与身份

### 好友(访客)

- 打开卡片 → `wx.login` → 后端换 openid → 自动建立这段对话。
- 同一个微信再次打开同一卡片,对话是连续的。
- 好友不需要输入任何账号密码。

### 主人

1. 网页端用邮箱 + 验证码登录 → 控制台「设置」→ 设置密码。
2. 小程序:从「最近使用」打开(没有卡片参数)→ 点「我是主人」→ 输入同一个邮箱 + 密码。
3. 登录后看到「我的嘴替」列表,每个团一个 **转发给好友** 按钮。
4. 「等你回答」里可以直接回答超纲问题。

> 主人入口只在小程序没有卡片参数时出现;好友从卡片进入不会看到。

## 4. 配置 AppSecret(真实 openid)

开发阶段没有 AppSecret 也能跑:后端 `MP_DEV_MODE=true` 时,小程序会带一个本地 `devOpenid`,后端直接用它做身份。

上线前在服务端 `.env` 配置:

```bash
WX_MP_APPID="wx322b1ce49c5e982b"
WX_MP_SECRET="在小程序后台 开发管理 → 开发设置 → 开发者ID 获取"
MP_DEV_MODE="false"
```

**AppSecret 不要写进小程序代码,也不要提交到 Git。**

## 5. 域名与备案

小程序 `wx.request` 要求:

- HTTPS,证书有效;
- 域名已 **ICP 备案**;
- 在「小程序后台 → 开发管理 → 开发设置 → 服务器域名」里添加 `https://zuiti.zxlumen.cn`。

当前 `zuiti.zxlumen.cn` 计划指向香港服务器。香港网站本身不需要备案,但小程序后台可能仍校验 ICP。拿到 AppID 后**先实际添加一次**:

- 能添加 → 直接用香港服务器;
- 提示未备案 → 两个选择:
  - **微信云托管/云开发**:小程序用 `wx.cloud.callContainer` / `callFunction`,不需要 request 域名;再让云函数代理到现有后端。
  - **大陆服务器 + ICP 备案**:把 `zxlumen.cn` 做接入备案,`zuiti` 指向大陆服务器。

### DNSPod + Caddy 参考

DNSPod 添加:

```
类型 A,主机 zuiti,值 103.205.240.62,TTL 600
```

服务器 Caddy:

```
zuiti.zxlumen.cn {
    reverse_proxy 127.0.0.1:3100
}
```

## 6. 发布与体验版

- **体验版**:上传代码 → 在后台把老板/测试好友加为「体验成员」→ 分享体验版二维码。体验版**不需要正式审核**,但只能扫码进入,不是聊天卡片。
- **正式版**:提交审核 → 发布。只有正式版才能在微信聊天里作为**小程序卡片**转发。
- 注意:小程序不能读取私聊消息,也不能代替你在私聊窗口里回复;好友必须点开卡片,在小程序里提问。

## 7. 基础信息重提(名称/头像/简介)

如果基础信息被驳回,建议按这套重提:

- **名称**:`小嘴替`(备选 `嘴替一下` / `嘴替ZuiTi` / `嘴替说`)
  - 「嘴替」裸名可能已被占用或被认为缺乏识别性;加限定词更稳。
- **类目**:`工具 → 效率`
- **头像**:`../public/zuiti-avatar.png`(512×512,暖橙底 + 对话气泡 + 「替」)
- **简介**:

  > 把你的项目资料整理成可问答的知识卡片,分享给同事或朋友。常见问题由卡片自动回答,需要你确认的问题会转交给你。

**审核材料里不要写**:代替本人回复、冒充本人、读取微信聊天记录、自动回复微信好友、最/第一/官方/永久免费。
产品里可以做本人口吻,但审核描述要按「知识卡片 / 沟通辅助」来写。

## 8. 目录

```
miniprogram/
  app.js / app.json / app.wxss
  config.js                  API 地址
  project.config.json        AppID / 开发者工具配置
  utils/request.js           请求封装 + wx.login
  pages/chat/                好友问答页
  pages/owner/index.js       主人登录 / 我的嘴替 / 转发
  pages/owner/answer.js      回答超纲问题
  pages/privacy/             隐私说明
  assets/share.png           分享卡片封面
```

## 9. 已知边界

- 小程序不会读取微信聊天记录,也不会自动回复私聊。
- 好友必须通过卡片/二维码进入小程序后提问。
- 转发卡片后,对方如果再次转发,新的打开者也会进入同一段对话;需要「一人一链接」时,用 H5 的「好友绑定」专属链接。
- 小程序名称、头像、简介和类目需要单独通过微信审核。
