const { request } = require("../../utils/request");

Page({
  data: {
    capsuleId: "",
    capsule: null,
    files: [],
    newFiles: [],
    deletedIds: [],
    notes: "",
    totalChars: 0,
    loading: true,
    uploading: false,
    saving: false,
    error: "",
    notice: "",
    preview: null,
  },

  onLoad(options) {
    this.setData({ capsuleId: (options && options.capsuleId) || "" });
    this.load();
  },

  calcTotal(files, newFiles, notes) {
    const existing = (files || []).reduce((sum, file) => sum + file.chars, 0);
    const added = (newFiles || []).reduce((sum, file) => sum + file.chars, 0);
    return existing + added + (notes || "").trim().length;
  },

  async load() {
    const token = getApp().globalData.ownerToken;
    if (!token) {
      wx.redirectTo({ url: "/pages/owner/index" });
      return;
    }

    const capsuleId = this.data.capsuleId;
    if (!capsuleId) {
      this.setData({ loading: false, error: "缺少 capsuleId" });
      return;
    }

    try {
      const data = await request({
        url: "/api/mp/capsules/" + encodeURIComponent(capsuleId),
        token,
      });
      const capsule = data.capsule;
      const files = capsule.files || [];
      const notes = capsule.notes || "";

      this.setData({
        capsule,
        files,
        newFiles: [],
        deletedIds: [],
        notes,
        totalChars: this.calcTotal(files, [], notes),
        loading: false,
        error: "",
        notice: "",
      });

      wx.setNavigationBarTitle({ title: capsule.title || "材料文件" });
    } catch (error) {
      this.setData({
        loading: false,
        error: error.message || "加载失败",
      });
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  onNotesInput(event) {
    const notes = event.detail.value;
    this.setData({
      notes,
      totalChars: this.calcTotal(this.data.files, this.data.newFiles, notes),
    });
  },

  onAddFiles() {
    if (this.data.uploading) return;

    wx.chooseMessageFile({
      count: 5,
      type: "file",
      extension: ["pdf", "docx", "txt", "md", "csv"],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length) {
          this.uploadFiles(res.tempFiles);
        }
      },
    });
  },

  async uploadFiles(list) {
    const token = getApp().globalData.ownerToken;
    if (!token) return;

    this.setData({ uploading: true, error: "", notice: "" });
    const added = [];
    const notices = [];
    let errorMessage = "";

    for (const file of list) {
      if (file.size > 10 * 1024 * 1024) {
        errorMessage = file.name + ":文件太大,请控制在 10MB 内";
        continue;
      }

      try {
        const data = await new Promise((resolve, reject) => {
          wx.uploadFile({
            url: getApp().globalData.apiBase + "/api/mp/extract",
            filePath: file.path,
            name: "file",
            header: { Authorization: "Bearer " + token },
            success(res) {
              try {
                const parsed = JSON.parse(res.data || "{}");
                if (res.statusCode >= 200 && res.statusCode < 300 && parsed.ok) {
                  resolve(parsed);
                } else {
                  reject(new Error(parsed.error || "解析失败"));
                }
              } catch {
                reject(new Error("解析失败"));
              }
            },
            fail(err) {
              reject(new Error(err.errMsg || "上传失败"));
            },
          });
        });

        added.push({
          name: file.name,
          content: data.text,
          chars: data.chars,
        });

        if (data.ocr) {
          notices.push(
            file.name +
              ":扫描件已 OCR" +
              (data.pages ? " " + data.pages + " 页" : "")
          );
        }
        if (data.warning) {
          notices.push(file.name + ":" + data.warning);
        }
      } catch (error) {
        errorMessage = file.name + ":" + (error.message || "上传失败");
      }
    }

    const newFiles = this.data.newFiles.concat(added);
    this.setData({
      newFiles,
      uploading: false,
      error: errorMessage,
      notice: notices.join(";"),
      totalChars: this.calcTotal(this.data.files, newFiles, this.data.notes),
    });
  },

  removeExisting(event) {
    const id = event.currentTarget.dataset.id;
    const files = this.data.files.filter((file) => file.id !== id);
    const deletedIds = this.data.deletedIds.concat(id);
    this.setData({
      files,
      deletedIds,
      totalChars: this.calcTotal(files, this.data.newFiles, this.data.notes),
    });
  },

  removeNew(event) {
    const index = Number(event.currentTarget.dataset.index);
    const newFiles = this.data.newFiles.filter((_, i) => i !== index);
    this.setData({
      newFiles,
      totalChars: this.calcTotal(this.data.files, newFiles, this.data.notes),
    });
  },

  async previewExisting(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name;
    this.setData({
      preview: { visible: true, name, content: "", loading: true },
    });

    try {
      const data = await request({
        url:
          "/api/mp/capsules/" +
          encodeURIComponent(this.data.capsuleId) +
          "/files/" +
          encodeURIComponent(id),
        token: getApp().globalData.ownerToken,
      });
      this.setData({
        preview: {
          visible: true,
          name: data.file.name,
          content: data.file.content,
          loading: false,
        },
      });
    } catch (error) {
      this.setData({
        preview: {
          visible: true,
          name,
          content: error.message || "加载失败",
          loading: false,
        },
      });
    }
  },

  previewNew(event) {
    const index = Number(event.currentTarget.dataset.index);
    const file = this.data.newFiles[index];
    if (!file) return;
    this.setData({
      preview: {
        visible: true,
        name: file.name,
        content: file.content,
        loading: false,
      },
    });
  },

  closePreview() {
    this.setData({ preview: null });
  },

  noop() {},

  async save() {
    if (this.data.saving || this.data.uploading) return;

    const token = getApp().globalData.ownerToken;
    if (!token) return;

    this.setData({ saving: true, error: "", notice: "" });

    try {
      await request({
        url:
          "/api/mp/capsules/" + encodeURIComponent(this.data.capsuleId),
        method: "PATCH",
        token,
        data: {
          deleteFileIds: this.data.deletedIds,
          newFiles: this.data.newFiles.map((file) => ({
            name: file.name,
            content: file.content,
          })),
          notes: this.data.notes,
        },
      });

      wx.showToast({ title: "已保存", icon: "success" });
      await this.load();
    } catch (error) {
      this.setData({ error: error.message || "保存失败" });
    } finally {
      this.setData({ saving: false });
    }
  },
});
