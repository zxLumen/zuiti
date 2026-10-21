function request(options) {
  const app = getApp();
  const header = { "Content-Type": "application/json" };
  if (options.token) header.Authorization = "Bearer " + options.token;

  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.apiBase + options.url,
      method: options.method || "GET",
      data: options.data || {},
      header,
      timeout: 180000,
      success(res) {
        const data = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && data.ok) {
          resolve(data);
          return;
        }
        reject(new Error(data.error || "请求失败(" + res.statusCode + ")"));
      },
      fail(err) {
        reject(new Error(err.errMsg || "网络错误"));
      },
    });
  });
}

function ensureMpSession(force) {
  const app = getApp();
  if (!force && app.globalData.mpToken) {
    return Promise.resolve(app.globalData.mpToken);
  }

  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (!res.code) {
          reject(new Error("微信登录失败"));
          return;
        }

        let devOpenid = wx.getStorageSync("devOpenid");
        if (!devOpenid) {
          devOpenid = "dev-" + Date.now();
          wx.setStorageSync("devOpenid", devOpenid);
        }

        request({
          url: "/api/mp/session",
          method: "POST",
          data: { code: res.code, devOpenid },
        })
          .then((data) => {
            app.globalData.mpToken = data.token;
            wx.setStorageSync("mpToken", data.token);
            resolve(data.token);
          })
          .catch(reject);
      },
      fail(err) {
        reject(new Error(err.errMsg || "微信登录失败"));
      },
    });
  });
}

module.exports = { request, ensureMpSession };
