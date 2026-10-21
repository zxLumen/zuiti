import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ci = require("miniprogram-ci");

const appid = "wx322b1ce49c5e982b";
const projectPath = "/home/ubuntu/Projects/zuiti/miniprogram";
const privateKeyPath =
  "/home/ubuntu/Projects/zuiti/.secrets/private.wx322b1ce49c5e982b.key";
const qrcodeOutputDest = "/home/ubuntu/Projects/zuiti/.secrets/preview-chat.png";

const project = new ci.Project({
  appid,
  type: "miniProgram",
  projectPath,
  privateKeyPath,
  ignores: ["node_modules/**/*", "**/*.md", ".git/**/*"],
});

function progress(info) {
  if (!info) return;
  if (typeof info === "string") {
    console.log(info);
    return;
  }
  if (info._msg) console.log(info._msg);
}

try {
  const result = await ci.preview({
    project,
    desc: "preview chat",
    setting: { es6: true, minify: true },
    qrcodeFormat: "image",
    qrcodeOutputDest,
    pagePath: "pages/chat/chat",
    searchQuery: "capsule=iJAw5QxKPpbs",
    onProgressUpdate: progress,
  });

  console.log("=== preview chat result ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("QR saved to:", qrcodeOutputDest);
} catch (error) {
  console.error("=== preview chat failed ===");
  console.error(error && error.message ? error.message : error);
  if (error && error.errCode !== undefined) {
    console.error("errCode:", error.errCode);
  }
  process.exit(1);
}
