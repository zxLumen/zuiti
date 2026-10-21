const { request } = require("../../utils/request");

Page({
  data: {
    loggedIn: false,
    loading: false,
    email: "",
    password: "",
    ownerEmail: "",
    capsules: [],
    escalations: [],
    error: "",
  },

  onShow() {
    wx.hideShareMenu();
    const token = getApp().globalData.ownerToken;
    this.setData({ loggedIn: !!token });
    if (token) this.load();
  },

  onPullDownRefresh() {
    if (!getApp().globalData.ownerToken) {
      wx.stopPullDownRefresh();
      return;
    }
    this.load(true).finally(() => wx.stopPullDownRefresh());
  },

  onEmailInput(event) {
    this.setData({ email: event.detail.value, error: "" });
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value, error: "" });
  },

  async login() {
    if (this.data.loading) return;

    const email = this.data.email.trim();
    const password = this.data.password;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.setData({ error: "请输入有效的邮箱" });
      return;
    }
    if (!password) {
      this.setData({ error: "请输入密码" });
      return;
    }

    this.setData({ loading: true, error: "" });
    try {
      const data = await request({
        url: "/api/mp/owner-login",
        method: "POST",
        data: { email, password },
      });

      getApp().globalData.ownerToken = data.token;
      wx.setStorageSync("ownerToken", data.token);
      this.setData({
        loggedIn: true,
        email: "",
        password: "",
        ownerEmail: data.email || email,
      });
      await this.load();
    } catch (error) {
      this.setData({ error: error.message || "登录失败" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async load(fromPull) {
    const token = getApp().globalData.ownerToken;
    if (!token) {
      this.setData({ loggedIn: false });
      return;
    }

    if (!fromPull) this.setData({ loading: true, error: "" });

    try {
      const [capsuleData, escalationData, contactData] = await Promise.all([
        request({ url: "/api/mp/capsules", token }),
        request({ url: "/api/mp/escalations", token }),
        request({ url: "/api/mp/contacts", token }),
      ]);

      const contacts = contactData.contacts || [];
      const capsules = (capsuleData.capsules || []).map((capsule) => ({
        ...capsule,
        contacts: contacts.filter(
          (contact) => contact.capsuleId === capsule.id,
        ),
      }));

      this.setData({
        loggedIn: true,
        loading: false,
        ownerEmail: capsuleData.email || this.data.ownerEmail,
        capsules,
        escalations: escalationData.escalations || [],
      });
    } catch (error) {
      if (/登录|401/.test(error.message || "")) {
        getApp().globalData.ownerToken = "";
        wx.removeStorageSync("ownerToken");
        this.setData({ loggedIn: false, loading: false, error: "" });
        return;
      }
      this.setData({ loading: false, error: error.message || "加载失败" });
    }
  },

  logout() {
    getApp().globalData.ownerToken = "";
    wx.removeStorageSync("ownerToken");
    this.setData({
      loggedIn: false,
      capsules: [],
      escalations: [],
      ownerEmail: "",
      error: "",
    });
  },

  goHome() {
    wx.reLaunch({ url: "/pages/home/home" });
  },

  goFiles(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: "/pages/owner/files?capsuleId=" + encodeURIComponent(id),
    });
  },

  goAnswer(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: "/pages/owner/answer?id=" + encodeURIComponent(id),
    });
  },

  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/privacy" });
  },

  onShareAppMessage(res) {
    const dataset = (res && res.target && res.target.dataset) || {};
    let capsule = dataset.capsule;
    let title = dataset.title;
    const contact = dataset.contact || "";

    if (!capsule && this.data.capsules.length) {
      const first = this.data.capsules[0];
      capsule = first.shareToken;
      title = first.title || first.ownerName;
    }

    if (!capsule) {
      return {
        title: "嘴替",
        path: "/pages/chat/chat",
        imageUrl: "/assets/share.png",
      };
    }

    let path = "/pages/chat/chat?capsule=" + capsule;
    if (contact) {
      path += "&contact=" + encodeURIComponent(contact);
    }

    return {
      title: title || "嘴替",
      path,
      imageUrl: "/assets/share.png",
    };
  },
});
