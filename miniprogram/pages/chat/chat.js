const { ensureMpSession, request } = require("../../utils/request");

Page({
  data: {
    loading: true,
    error: "",
    capsule: null,
    messages: [],
    input: "",
    sending: false,
    pending: 0,
    justEscalated: false,
    scrollInto: "",
    persona: true,
    ownerName: "对方",
    ownerInitial: "替",
    title: "",
    subtitle: "",
    suggestions: [],
    emptyTitle: "",
    emptyDesc: "",
    placeholder: "发消息…",
    noCapsule: false,
  },

  onLoad(options) {
    this.capsuleToken = (options && options.capsule) || "";
    this.contactToken = (options && options.contact) || "";
    wx.hideShareMenu();

    if (this.capsuleToken) {
      wx.setStorageSync("lastCapsule", {
        capsule: this.capsuleToken,
        contact: this.contactToken || "",
      });
    }

    if (!this.capsuleToken) {
      this.setData({
        loading: false,
        noCapsule: true,
        error: "如果你是从分享卡片进来的,请重新打开;如果你是主人,点下面进入主人入口。",
      });
      return;
    }

    this.init();
  },

  onShow() {
    if (this.capsuleToken && getApp().globalData.mpToken) {
      this.startPolling();
    }
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  async init() {
    try {
      await ensureMpSession();
      await this.loadState(true);
      this.startPolling();
    } catch (error) {
      this.setData({
        loading: false,
        error: error.message || "加载失败,请重试",
      });
    }
  },

  async loadState(initial) {
    let url =
      "/api/mp/chat?capsuleToken=" +
      encodeURIComponent(this.capsuleToken);
    if (this.contactToken) {
      url += "&contactToken=" + encodeURIComponent(this.contactToken);
    }

    const data = await request({
      url,
      token: getApp().globalData.mpToken,
    });

    const capsule = data.capsule || {};
    const incoming = data.messages || [];
    const messages = initial
      ? incoming
      : this.merge(this.data.messages, incoming);

    const persona = capsule.transparency === "persona";
    const ownerName = capsule.ownerName || "对方";
    const title = capsule.title || "";
    const subtitle = capsule.subtitle || "";

    const emptyTitle = persona
      ? "有什么想了解的,直接问我就行"
      : "你可以直接问关于「" + title + "」的任何问题";
    const emptyDesc = persona
      ? "关于「" +
        title +
        "」的事,我知道的都会直接回你;需要确认的,我确认后再回。"
      : "这里是 " +
        ownerName +
        " 的代表。范围内的它直接答;超出范围的,会转给 " +
        ownerName +
        " 本人。";
    const placeholder = persona
      ? "发消息…"
      : "问关于「" + title + "」的任何问题…";

    this.setData({
      loading: false,
      error: "",
      capsule,
      messages,
      pending: data.pending || 0,
      persona,
      ownerName,
      ownerInitial: ownerName.slice(0, 1),
      title,
      subtitle,
      suggestions: capsule.suggestions || [],
      emptyTitle,
      emptyDesc,
      placeholder,
      scrollInto: messages.length
        ? "msg-" + messages[messages.length - 1].id
        : "",
    });

    wx.setNavigationBarTitle({
      title: title || ownerName || "嘴替",
    });
  },

  merge(prev, incoming) {
    const map = {};
    const list = prev || [];
    list.forEach((item) => {
      map[item.id] = item;
    });
    (incoming || []).forEach((item) => {
      map[item.id] = item;
    });
    return Object.keys(map)
      .map((key) => map[key])
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  },

  startPolling() {
    this.stopPolling();
    this.timer = setInterval(() => {
      if (this.data.sending || !this.capsuleToken) return;
      this.loadState(false).catch(() => {});
    }, 6000);
  },

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  onInput(event) {
    this.setData({ input: event.detail.value });
  },

  onSuggestion(event) {
    const question = event.currentTarget.dataset.q;
    this.send(question);
  },

  async send(text) {
    const content = (
      typeof text === "string" ? text : this.data.input
    ).trim();

    if (!content || this.data.sending) return;

    const temp = {
      id: "temp-" + Date.now(),
      role: "visitor",
      content,
      createdAt: new Date().toISOString(),
    };

    this.setData({
      sending: true,
      input: "",
      error: "",
      messages: this.data.messages.concat(temp),
      scrollInto: "msg-" + temp.id,
    });

    try {
      const payload = {
        capsuleToken: this.capsuleToken,
        content,
      };
      if (this.contactToken) {
        payload.contactToken = this.contactToken;
      }

      const data = await request({
        url: "/api/mp/chat",
        method: "POST",
        token: getApp().globalData.mpToken,
        data: payload,
      });

      const next = this.merge(
        this.data.messages.filter((item) => item.id !== temp.id),
        data.messages || [],
      );

      this.setData({
        messages: next,
        pending:
          data.pending !== undefined ? data.pending : this.data.pending,
        justEscalated: !!data.escalated,
        scrollInto: next.length ? "msg-" + next[next.length - 1].id : "",
      });
    } catch (error) {
      this.setData({
        messages: this.data.messages.filter((item) => item.id !== temp.id),
        input: content,
        error: error.message || "发送失败,请重试",
      });
      wx.showToast({ title: error.message || "发送失败", icon: "none" });
    } finally {
      this.setData({ sending: false });
    }
  },

  retry() {
    this.setData({ loading: true, error: "" });
    this.init();
  },

  openOwner() {
    wx.navigateTo({ url: "/pages/owner/index" });
  },

  goHome() {
    wx.reLaunch({ url: "/pages/home/home" });
  },
});
