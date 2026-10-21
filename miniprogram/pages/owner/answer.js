const { request } = require("../../utils/request");

Page({
  data: {
    id: "",
    loading: true,
    escalation: null,
    answer: "",
    sending: false,
    error: "",
  },

  onLoad(options) {
    this.setData({ id: (options && options.id) || "" });
    this.load();
  },

  async load() {
    const token = getApp().globalData.ownerToken;
    if (!token) {
      wx.redirectTo({ url: "/pages/owner/index" });
      return;
    }
    if (!this.data.id) {
      this.setData({ loading: false, error: "缺少问题 ID" });
      return;
    }

    try {
      const data = await request({
        url: "/api/mp/escalations/" + encodeURIComponent(this.data.id),
        token,
      });
      this.setData({ loading: false, escalation: data.escalation });
    } catch (error) {
      this.setData({ loading: false, error: error.message || "加载失败" });
    }
  },

  onInput(event) {
    this.setData({ answer: event.detail.value, error: "" });
  },

  async submit() {
    const answer = this.data.answer.trim();
    if (!answer) {
      this.setData({ error: "先写点回答吧" });
      return;
    }
    if (this.data.sending) return;

    this.setData({ sending: true, error: "" });
    try {
      await request({
        url:
          "/api/mp/escalations/" +
          encodeURIComponent(this.data.id) +
          "/answer",
        method: "POST",
        token: getApp().globalData.ownerToken,
        data: { answer },
      });
      wx.showToast({ title: "已回复", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      this.setData({
        sending: false,
        error: error.message || "提交失败",
      });
    }
  },
});
