Page({
  data: {
    hasOwner: false,
    hasLast: false,
    last: null,
  },

  onShow() {
    const last = wx.getStorageSync("lastCapsule");
    this.setData({
      hasOwner: Boolean(getApp().globalData.ownerToken),
      hasLast: Boolean(last && last.capsule),
      last: last || null,
    });
  },

  goOwner() {
    wx.navigateTo({ url: "/pages/owner/index" });
  },

  continueLast() {
    const last = this.data.last;
    if (!last || !last.capsule) return;

    let url =
      "/pages/chat/chat?capsule=" + encodeURIComponent(last.capsule);
    if (last.contact) {
      url += "&contact=" + encodeURIComponent(last.contact);
    }
    wx.navigateTo({ url });
  },
});
