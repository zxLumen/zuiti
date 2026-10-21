const PROD_API_BASE = "https://zuiti.zxlumen.cn";
// 默认直连线上后端,开发者和服务器不在同一台机器时也能用。
// 如果你想连本机后端,改成 http://localhost:3100,并在开发者工具勾选「不校验合法域名」。
const DEV_API_BASE = "https://zuiti.zxlumen.cn";

function resolveApiBase() {
  try {
    const env = wx.getAccountInfoSync().miniProgram.envVersion;
    return env === "develop" ? DEV_API_BASE : PROD_API_BASE;
  } catch {
    return PROD_API_BASE;
  }
}

module.exports = {
  PROD_API_BASE,
  DEV_API_BASE,
  API_BASE: resolveApiBase(),
};
