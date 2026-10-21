const config = require("./config");

App({
  globalData: {
    apiBase: config.API_BASE,
    mpToken: "",
    ownerToken: "",
  },
  onLaunch() {
    this.globalData.mpToken = wx.getStorageSync("mpToken") || "";
    this.globalData.ownerToken = wx.getStorageSync("ownerToken") || "";
  },
});
