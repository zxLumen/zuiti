import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ci = require("miniprogram-ci");

const appid = "wx322b1ce49c5e982b";
const projectPath = "/home/ubuntu/Projects/zuiti/miniprogram";
const privateKeyPath =
  "/home/ubuntu/Projects/zuiti/.secrets/private.wx322b1ce49c5e982b.key";

const version = process.argv[2] || "0.1.0";
const desc = process.argv[3] || "first test build";

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
  const result = await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      minify: true,
      ignoreUploadUnusedFiles: true,
    },
    onProgressUpdate: progress,
  });

  console.log("=== upload result ===");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("=== upload failed ===");
  console.error(error && error.message ? error.message : error);
  if (error && error.errCode !== undefined) {
    console.error("errCode:", error.errCode);
  }
  process.exit(1);
}
