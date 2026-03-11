(() => {
  window.__overridesLoaded = true;

  const store = {
    status: null,
    secrets: [],
    channels: [],
    tokens: null,
    permissions: null,
    coreDocs: [],
    currentDoc: null,
    skills: null,
    skillPreview: "",
    onlineSkillResults: [],
    maintenance: null,
  };

  const ui = {
    secretQuery: "",
    secretFilter: "all",
    tokenDays: 7,
    tokenCustomDays: 14,
    tokenConfiguredOnly: true,
    tokenSelectedModel: "all",
    tokenModelPinned: false,
    channelTab: "overview",
    workspaceTab: "docs",
    docQuery: "",
    skillQuery: "",
    onlineSkillQuery: "",
    skillSourceTab: "local",
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function esc(value) {
    return window.escapeHtml ? window.escapeHtml(value) : String(value ?? "");
  }

  function reportError(error) {
    window.setResult?.(String(error?.message || error));
  }

  async function getJson(path) {
    const data = await window.request(path);
    return data.data;
  }

  function injectStyles() {
    if ($("#overrides-style")) return;
    const style = document.createElement("style");
    style.id = "overrides-style";
    style.textContent = `
      .extra-panel {
        display: grid;
        gap: 14px;
      }
      .extra-card {
        border: 1px solid rgba(130, 148, 170, 0.16);
        border-radius: 18px;
        padding: 16px 18px;
        background: linear-gradient(180deg, rgba(9, 15, 24, 0.9), rgba(7, 11, 18, 0.96));
      }
      .extra-kicker {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(158, 181, 199, 0.8);
      }
      .extra-title {
        margin-top: 8px;
        font-size: 20px;
        font-weight: 700;
        color: #f4fbff;
      }
      .extra-note {
        margin-top: 8px;
        color: rgba(225, 232, 238, 0.76);
        line-height: 1.6;
      }
      .extra-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }
      .extra-item {
        border: 1px solid rgba(130, 148, 170, 0.1);
        border-radius: 14px;
        padding: 12px 14px;
        background: rgba(11, 18, 28, 0.72);
      }
      .extra-label {
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(158, 181, 199, 0.76);
      }
      .extra-value {
        margin-top: 6px;
        color: #f4fbff;
        font-weight: 600;
        word-break: break-word;
      }
      .extra-actions,
      .token-toolbar,
      .workspace-toolbar,
      .picker-actions,
      .skill-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }
      .search-input-clean,
      .textarea-clean,
      .inline-number,
      .inline-select,
      .inline-input {
        width: 100%;
        border: 1px solid rgba(130, 148, 170, 0.16);
        border-radius: 14px;
        background: rgba(11, 18, 28, 0.72);
        color: #f4fbff;
        padding: 12px 14px;
        font: inherit;
      }
      .textarea-clean {
        min-height: 120px;
        resize: vertical;
      }
      .filter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .filter-button.active,
      .mini-button.active {
        border-color: rgba(61, 222, 193, 0.5);
        color: #ecfffb;
        box-shadow: 0 0 0 1px rgba(61, 222, 193, 0.16) inset;
      }
      .secret-card-clean,
      .skill-card,
      .doc-card-clean {
        border: 1px solid rgba(130, 148, 170, 0.1);
        border-radius: 14px;
        padding: 12px 14px;
        background: rgba(11, 18, 28, 0.72);
      }
      .secret-card-head,
      .doc-card-head,
      .skill-card-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }
      .secret-card-clean + .secret-card-clean,
      .skill-card + .skill-card,
      .doc-card-clean + .doc-card-clean {
        margin-top: 10px;
      }
      .secret-preview-clean,
      .skill-path,
      .doc-path,
      .skill-description {
        margin-top: 8px;
        color: rgba(225, 232, 238, 0.76);
        word-break: break-word;
        line-height: 1.55;
      }
      .status-strip-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 12px 0 14px;
      }
      .channel-card.recommended-channel {
        border-color: rgba(61, 222, 193, 0.28);
        box-shadow: 0 0 0 1px rgba(61, 222, 193, 0.12) inset;
      }
      .channel-summary-note {
        margin-top: 8px;
        color: rgba(225, 232, 238, 0.76);
        line-height: 1.6;
      }
      .token-layout,
      .workspace-layout {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 14px;
      }
      .token-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14px;
      }
      .token-table th,
      .token-table td {
        padding: 10px 12px;
        border-bottom: 1px solid rgba(130, 148, 170, 0.1);
        text-align: left;
      }
      .token-table th {
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(158, 181, 199, 0.76);
      }
      .token-table tr.is-selected {
        background: rgba(61, 222, 193, 0.08);
      }
      .token-chart-shell {
        margin-top: 14px;
        border: 1px solid rgba(130, 148, 170, 0.12);
        border-radius: 16px;
        padding: 14px;
        background: rgba(5, 10, 17, 0.72);
      }
      .token-chart-svg {
        width: 100%;
        height: auto;
        display: block;
      }
      .token-chart-legend {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 12px;
        color: rgba(225, 232, 238, 0.78);
        font-size: 13px;
      }
      .token-chart-empty {
        padding: 28px 16px;
        text-align: center;
        color: rgba(225, 232, 238, 0.72);
      }
      .workspace-columns {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 14px;
      }
      .workspace-subtabs {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }
      .workspace-subtab {
        border: 1px solid rgba(130, 148, 170, 0.16);
        border-radius: 999px;
        background: rgba(11, 18, 28, 0.72);
        color: rgba(220, 234, 245, 0.84);
        padding: 8px 14px;
        font: inherit;
        cursor: pointer;
      }
      .workspace-subtab.active {
        border-color: rgba(61, 222, 193, 0.5);
        color: #ecfffb;
        box-shadow: 0 0 0 1px rgba(61, 222, 193, 0.16) inset;
      }
      .workspace-subpanel {
        display: none;
        margin-top: 14px;
      }
      .workspace-subpanel.active {
        display: block;
      }
      .channels-subtabs {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 14px 0;
      }
      .channels-subpanel {
        display: none;
      }
      .channels-subpanel.active {
        display: block;
      }
      .channel-overview-shell {
        display: none;
      }
      .channel-overview-shell.active {
        display: block;
      }
      .panel-connection.compact-connection .panel-hint {
        margin: 8px 0 10px;
        font-size: 13px;
        line-height: 1.5;
      }
      .panel-connection.compact-connection .connection-settings-form {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .panel-connection.compact-connection .connection-settings-form > label,
      .panel-connection.compact-connection .connection-settings-form > .connection-meta,
      .panel-connection.compact-connection .connection-settings-form > .inline-actions {
        margin: 0;
      }
      .panel-connection.compact-connection .connection-meta {
        grid-column: 1 / -1;
      }
      .panel-connection.compact-connection .inline-actions {
        grid-column: 1 / -1;
      }
      .workspace-list-shell {
        min-height: 0;
      }
      .workspace-list-scroll {
        max-height: min(68vh, 640px);
        overflow-y: auto;
        padding-right: 4px;
      }
      .workspace-list-scroll::-webkit-scrollbar {
        width: 9px;
      }
      .workspace-list-scroll::-webkit-scrollbar-thumb {
        background: rgba(130, 148, 170, 0.24);
        border-radius: 999px;
      }
      .workspace-list-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .workspace-stack {
        display: grid;
        gap: 14px;
      }
      .workspace-editor-stack {
        display: grid;
        gap: 14px;
        min-height: min(68vh, 640px);
      }
      .workspace-doc-editor {
        min-height: min(48vh, 480px);
      }
      .workspace-source-panel {
        display: none;
      }
      .workspace-source-panel.active {
        display: grid;
        gap: 14px;
      }
      .doc-card-clean.active,
      .skill-card.active {
        border-color: rgba(61, 222, 193, 0.4);
        box-shadow: 0 0 0 1px rgba(61, 222, 193, 0.14) inset;
      }
      .doc-meta,
      .skill-meta {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .soft-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(130, 148, 170, 0.12);
        color: #dceaf5;
        font-size: 12px;
      }
      .soft-badge.good {
        background: rgba(61, 222, 193, 0.14);
        color: #dbfff7;
      }
      .soft-badge.warn {
        background: rgba(255, 196, 61, 0.14);
        color: #ffe9a8;
      }
      .soft-badge.muted {
        background: rgba(130, 148, 170, 0.14);
        color: rgba(220, 234, 245, 0.86);
      }
      .preview-box {
        margin-top: 12px;
        padding: 14px;
        border-radius: 14px;
        background: rgba(5, 10, 17, 0.72);
        border: 1px solid rgba(130, 148, 170, 0.12);
        color: #f4fbff;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 420px;
        overflow: auto;
      }
      .inline-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        margin-top: 12px;
      }
      .permission-area {
        display: grid;
        gap: 10px;
      }
      .permission-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .danger-card {
        border-color: rgba(255, 120, 120, 0.22);
        background: linear-gradient(180deg, rgba(34, 11, 14, 0.92), rgba(19, 8, 10, 0.96));
      }
      .danger-actions {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }
      .danger-note {
        color: rgba(255, 222, 222, 0.82);
        line-height: 1.6;
      }
      .confirm-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      }
      .maintenance-list {
        display: grid;
        gap: 10px;
      }
      .maintenance-item {
        border: 1px solid rgba(130, 148, 170, 0.1);
        border-radius: 14px;
        padding: 12px 14px;
        background: rgba(11, 18, 28, 0.72);
      }
      .maintenance-meta {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .empty-state.clean {
        padding: 24px 16px;
        text-align: center;
        color: rgba(225, 232, 238, 0.76);
        border: 1px dashed rgba(130, 148, 170, 0.2);
        border-radius: 14px;
      }
      .token-model-title {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .token-model-note {
        margin-top: 8px;
        color: rgba(225, 232, 238, 0.72);
        line-height: 1.55;
      }
      .token-row-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
      }
      @media (max-width: 1100px) {
        .token-layout,
        .workspace-layout,
        .workspace-columns,
        .status-strip-grid,
        .extra-grid {
          grid-template-columns: 1fr;
        }
        .panel-connection.compact-connection .connection-settings-form {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTabsAndPanels() {
    const switcher = $(".view-switcher");
    const content = $(".content-area");
    if (!switcher || !content) return;

    const tabs = [
      ["tokens", "Token 用量"],
      ["permissions", "权限策略"],
      ["workspace", "工作区"],
    ];

    for (const [view, label] of tabs) {
      if (!$(`[data-view="${view}"]`, switcher)) {
        const button = document.createElement("button");
        button.className = "view-tab";
        button.type = "button";
        button.dataset.view = view;
        button.textContent = label;
        button.addEventListener("click", () => window.switchView?.(view));
        switcher.appendChild(button);
      }
    }

    if (!$("[data-view-panel='tokens']", content)) {
      const panel = document.createElement("section");
      panel.className = "view-panel";
      panel.dataset.viewPanel = "tokens";
      panel.innerHTML = `
        <article class="panel">
          <div class="panel-head">
            <span class="panel-kicker">Token 用量</span>
            <button class="mini-button" id="refresh-token-usage" type="button">刷新</button>
          </div>
          <div id="tokens-root" class="extra-panel"></div>
        </article>
      `;
      content.appendChild(panel);
    }

    if (!$("[data-view-panel='permissions']", content)) {
      const panel = document.createElement("section");
      panel.className = "view-panel";
      panel.dataset.viewPanel = "permissions";
      panel.innerHTML = `
        <article class="panel">
          <div class="panel-head">
            <span class="panel-kicker">权限策略</span>
            <button class="mini-button" id="refresh-permissions" type="button">刷新</button>
          </div>
          <div id="permissions-root" class="extra-panel"></div>
        </article>
      `;
      content.appendChild(panel);
    }

    if (!$("[data-view-panel='workspace']", content)) {
      const panel = document.createElement("section");
      panel.className = "view-panel";
      panel.dataset.viewPanel = "workspace";
      panel.innerHTML = `
        <article class="panel">
          <div class="panel-head">
            <span class="panel-kicker">工作区</span>
            <button class="mini-button" id="refresh-workspace" type="button">刷新</button>
          </div>
          <div id="workspace-root" class="extra-panel"></div>
        </article>
      `;
      content.appendChild(panel);
    }

    $("#refresh-token-usage")?.addEventListener("click", () => refreshTokens().catch(reportError));
    $("#refresh-permissions")?.addEventListener("click", () => refreshPermissions().catch(reportError));
    $("#refresh-workspace")?.addEventListener("click", () => refreshWorkspace().catch(reportError));
  }

  function getChannelExperience(item) {
    if (!item) {
      return { missing: [], nextStep: "先刷新", summary: "暂无数据" };
    }
    const fields = item.fields || {};
    const missing = [];
    if (item.channel === "feishu") {
      if (!fields.appId) missing.push("App ID");
      if (!fields.appSecret) missing.push("App Secret");
    }
    if (item.channel === "telegram") {
      if (!fields.botToken) missing.push("Bot Token");
      if (!fields.ownerUserId) missing.push("Owner User ID");
    }
    let nextStep = "已完成";
    if (missing.length) nextStep = "先补字段";
    else if (!item.configured) nextStep = "先保存通道";
    else if (!item.tested) nextStep = "先做一次测试";
    return {
      missing,
      nextStep,
      summary: missing.length ? `缺少 ${missing.join(" / ")}` : "凭据已齐全",
    };
  }

  function getRecommendedChannel() {
    return (
      store.channels
        .map((item) => ({ item, experience: getChannelExperience(item) }))
        .sort((a, b) => {
          const score = (entry) => {
            if (entry.experience.missing.length) return 0;
            if (!entry.item.configured) return 1;
            if (!entry.item.tested) return 2;
            return 3;
          };
          return score(a) - score(b);
        })[0] || null
    );
  }

  function jumpToSecret(label) {
    const match = store.secrets.find((item) => item.label === label);
    if (!match) return;
    ui.channelTab = "secrets";
    window.switchView?.("channels");
    ensureChannelSecretTabs();
    $("#secret-key").value = match.key;
    $("#secret-value")?.focus();
    window.focusPanel?.("secret-form");
    window.setResult?.(`已带你跳到 ${label}。`);
  }

  function focusChannelField(channelKey, fieldName) {
    ui.channelTab = "channels";
    window.switchView?.("channels");
    ensureChannelSecretTabs();
    const card = $(`.channel-card[data-channel-card="${channelKey}"]`);
    if (!card) return;

    if (fieldName === "__test__") {
      const testButton = $("[data-test-channel]", card);
      testButton?.scrollIntoView({ behavior: "smooth", block: "center" });
      testButton?.focus();
      return;
    }

    const field = $(`[name="${fieldName}"]`, card);
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.focus();
    field.classList.add("panel-flash");
    window.setTimeout(() => field.classList.remove("panel-flash"), 1500);
  }

  function executeRecommendedChannelAction() {
    const recommended = getRecommendedChannel();
    if (!recommended) return;
    const firstMissing = recommended.experience.missing[0];
    if (firstMissing === "App ID") return focusChannelField(recommended.item.channel, "appId");
    if (firstMissing === "App Secret") return focusChannelField(recommended.item.channel, "appSecret");
    if (firstMissing === "Bot Token") return focusChannelField(recommended.item.channel, "botToken");
    if (firstMissing === "Owner User ID") return focusChannelField(recommended.item.channel, "ownerUserId");
    if (!recommended.item.configured) return focusChannelField(recommended.item.channel, "enabled");
    return focusChannelField(recommended.item.channel, "__test__");
  }

  function secretMatchesFilter(item) {
    const query = ui.secretQuery.trim().toLowerCase();
    if (query) {
      const haystack = `${item.label} ${item.preview}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (ui.secretFilter === "missing") return !item.configured;
    if (ui.secretFilter === "channel") return item.label.includes("Feishu");
    if (ui.secretFilter === "provider") return Boolean(item.providerKey);
    return true;
  }

  function renderSecretEnhancements() {
    const panel = $(".panel-secrets");
    const root = $("#secrets-list");
    if (!panel || !root) return;

    let guidance = $("#secret-guidance-card", panel);
    if (!guidance) {
      guidance = document.createElement("div");
      guidance.id = "secret-guidance-card";
      guidance.className = "extra-card";
      $(".secret-editor-shell", panel)?.before(guidance);
    }

    let toolbar = $("#secret-toolbar-clean", panel);
    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.id = "secret-toolbar-clean";
      toolbar.className = "extra-card";
      root.before(toolbar);
    }

    const missingSecrets = store.secrets.filter((item) => !item.configured).map((item) => item.label);
    const feishu = getChannelExperience(store.channels.find((item) => item.channel === "feishu"));
    const telegram = getChannelExperience(store.channels.find((item) => item.channel === "telegram"));
    const filtered = store.secrets.filter(secretMatchesFilter);

    guidance.innerHTML = `
      <div class="extra-kicker">密钥联动</div>
      <div class="extra-note">先把缺口补齐，再回到右边通道卡保存并测试，这样来回跳转会少很多。</div>
      <div class="extra-grid">
        <div class="extra-item">
          <div class="extra-label">待补密钥</div>
          <div class="extra-value">${esc(missingSecrets.length ? missingSecrets.join(" / ") : "当前没有待补密钥")}</div>
        </div>
        <div class="extra-item">
          <div class="extra-label">飞书状态</div>
          <div class="extra-value">${esc(feishu.summary)}</div>
        </div>
        <div class="extra-item">
          <div class="extra-label">Telegram 状态</div>
          <div class="extra-value">${esc(telegram.summary)}</div>
        </div>
        <div class="extra-item">
          <div class="extra-label">建议顺序</div>
          <div class="extra-value">先补密钥，再保存通道，最后做测试</div>
        </div>
      </div>
    `;

    toolbar.innerHTML = `
      <div class="extra-kicker">筛选与定位</div>
      <input id="secret-query-clean" class="search-input-clean" type="text" placeholder="搜索密钥名称或预览" value="${esc(ui.secretQuery)}" />
      <div class="filter-row">
        <button class="mini-button filter-button ${ui.secretFilter === "all" ? "active" : ""}" type="button" data-secret-filter="all">全部</button>
        <button class="mini-button filter-button ${ui.secretFilter === "missing" ? "active" : ""}" type="button" data-secret-filter="missing">未设置</button>
        <button class="mini-button filter-button ${ui.secretFilter === "channel" ? "active" : ""}" type="button" data-secret-filter="channel">通道相关</button>
        <button class="mini-button filter-button ${ui.secretFilter === "provider" ? "active" : ""}" type="button" data-secret-filter="provider">Provider 相关</button>
      </div>
    `;

    root.innerHTML = filtered.length
      ? filtered
          .map(
            (item) => `
              <div class="secret-card-clean">
                <div class="secret-card-head">
                  <strong>${esc(item.label)}</strong>
                  <span class="soft-badge ${item.configured ? "good" : "warn"}">${item.configured ? "已设置" : "未设置"}</span>
                </div>
                <div class="secret-preview-clean">${esc(item.preview || "尚未填写")}</div>
                <div class="skill-actions">
                  <button class="mini-button" type="button" data-secret-fill="${esc(item.key)}">带入表单</button>
                  <button class="mini-button" type="button" data-secret-clear="${esc(item.key)}">清空</button>
                  ${item.providerKey ? `<button class="mini-button" type="button" data-secret-test="${esc(item.providerKey)}">测试</button>` : ""}
                </div>
              </div>
            `
          )
          .join("")
      : '<div class="empty-state clean">当前筛选条件下没有密钥项。</div>';

    $("#secret-query-clean", toolbar)?.addEventListener("input", (event) => {
      ui.secretQuery = event.target.value;
      renderSecretEnhancements();
    });
    $$("[data-secret-filter]", toolbar).forEach((button) => {
      button.addEventListener("click", () => {
        ui.secretFilter = button.dataset.secretFilter;
        renderSecretEnhancements();
      });
    });
    $$("[data-secret-fill]", root).forEach((button) => {
      button.addEventListener("click", () => {
        $("#secret-key").value = button.dataset.secretFill;
        $("#secret-value")?.focus();
        window.focusPanel?.("secret-form");
      });
    });
    $$("[data-secret-clear]", root).forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await window.request("/api/secrets/delete", {
            method: "POST",
            body: JSON.stringify({ key: button.dataset.secretClear }),
          });
          await Promise.all([window.refreshSecrets?.(), window.refreshSelfCheck?.(), window.refreshSetupGuide?.(), window.refreshLogs?.()]);
        } catch (error) {
          reportError(error);
        }
      });
    });
    $$("[data-secret-test]", root).forEach((button) => {
      button.addEventListener("click", () => window.runProviderTest?.(button.dataset.secretTest));
    });
  }

  function renderChannelEnhancements() {
    const panel = $("#channels-panel");
    const root = $("#channels-list");
    if (!panel || !root) return;

    let summaryCard = $("#channel-overview-clean", panel);
    if (!summaryCard) {
      summaryCard = document.createElement("div");
      summaryCard.id = "channel-overview-clean";
      summaryCard.className = "extra-card";
      root.before(summaryCard);
    }

    const configuredCount = store.channels.filter((item) => item.configured).length;
    const testedCount = store.channels.filter((item) => item.tested).length;
    const recommended = getRecommendedChannel();
    const missingSummary = store.channels.flatMap((item) => getChannelExperience(item).missing.map((name) => `${item.label}: ${name}`));

    summaryCard.innerHTML = `
      <div class="extra-kicker">通道总览</div>
      <div class="extra-title">先确认缺口，再保存，再测试</div>
      <div class="extra-note">飞书和 Telegram 都按同一套工作流来走：先看凭据，再看是否已经保存，最后再做一次测试闭环。</div>
      <div class="extra-grid">
        <div class="extra-item">
          <div class="extra-label">已配置通道</div>
          <div class="extra-value">${configuredCount} / ${store.channels.length}</div>
        </div>
        <div class="extra-item">
          <div class="extra-label">已测试通道</div>
          <div class="extra-value">${testedCount} / ${store.channels.length}</div>
        </div>
        <div class="extra-item">
          <div class="extra-label">当前建议</div>
          <div class="extra-value">${esc(recommended?.experience?.nextStep || "先刷新")}</div>
        </div>
        <div class="extra-item">
          <div class="extra-label">待补缺口</div>
          <div class="extra-value">${esc(missingSummary.length ? missingSummary.join(" / ") : "当前没有待补项")}</div>
        </div>
      </div>
      <div class="extra-actions">
        ${recommended ? '<button class="mini-button primary" type="button" id="channel-handle-recommended">处理推荐通道</button>' : ""}
        ${recommended?.experience?.missing?.includes("App Secret") ? '<button class="mini-button" type="button" data-secret-jump="Feishu App Secret">跳到飞书密钥</button>' : ""}
      </div>
    `;

    $("#channel-handle-recommended", summaryCard)?.addEventListener("click", executeRecommendedChannelAction);
    $("[data-secret-jump]", summaryCard)?.addEventListener("click", () => jumpToSecret("Feishu App Secret"));

    $$(".channel-card", root).forEach((card) => {
      const channelKey = card.dataset.channelCard;
      const record = store.channels.find((item) => item.channel === channelKey);
      const experience = getChannelExperience(record);
      card.classList.toggle("recommended-channel", recommended?.item?.channel === channelKey);
      $(".channel-summary", card)?.classList.add("channel-summary-note");

      let strip = $(".status-strip-grid", card);
      if (!strip) {
        strip = document.createElement("div");
        strip.className = "status-strip-grid";
        card.prepend(strip);
      }
      strip.innerHTML = `
        <div class="extra-item">
          <div class="extra-label">凭据状态</div>
          <div class="extra-value">${esc(experience.summary)}</div>
        </div>
        <div class="extra-item">
          <div class="extra-label">推荐下一步</div>
          <div class="extra-value">${esc(experience.nextStep)}</div>
        </div>
      `;

      const submit = $("button[type='submit']", card);
      const test = $("[data-test-channel]", card);
      const remove = $("[data-delete-channel]", card);
      if (submit) submit.textContent = "保存这张卡";
      if (test) test.textContent = "测试这张卡";
      if (remove) remove.textContent = "删除";
    });
  }

  function ensureChannelSecretTabs() {
    const view = document.querySelector('[data-view-panel="channels"] .content-row-channels');
    if (!view) return;
    const connectionPanel = $(".panel-connection", view);
    const secretPanel = $(".panel-secrets", view);
    const channelPanel = $("#channels-panel", view);
    if (!connectionPanel || !secretPanel || !channelPanel) return;

    let tabs = $("#channels-sections-tabs", view);
    if (!tabs) {
      tabs = document.createElement("div");
      tabs.id = "channels-sections-tabs";
      tabs.className = "channels-subtabs";
      tabs.innerHTML = `
        <button class="workspace-subtab" type="button" data-channel-tab="overview">概览</button>
        <button class="workspace-subtab" type="button" data-channel-tab="connection">连接设置</button>
        <button class="workspace-subtab" type="button" data-channel-tab="channels">通道</button>
        <button class="workspace-subtab" type="button" data-channel-tab="secrets">密钥</button>
      `;
      view.insertBefore(tabs, connectionPanel);
    }

    connectionPanel.classList.add("channels-subpanel");
    secretPanel.classList.add("channels-subpanel");
    channelPanel.classList.add("channels-subpanel");
    connectionPanel.classList.toggle("active", ui.channelTab === "connection");
    secretPanel.classList.toggle("active", ui.channelTab === "secrets");
    channelPanel.classList.toggle("active", ui.channelTab === "overview" || ui.channelTab === "channels");

    const overview = $("#channel-overview-clean", channelPanel);
    const channelGrid = $("#channels-list", channelPanel);
    if (overview) {
      overview.classList.add("channel-overview-shell");
      overview.classList.toggle("active", ui.channelTab === "overview");
    }
    if (channelGrid) {
      channelGrid.style.display = ui.channelTab === "channels" ? "" : "none";
    }

    $$("[data-channel-tab]", tabs).forEach((button) => {
      button.classList.toggle("active", button.dataset.channelTab === ui.channelTab);
      button.onclick = () => {
        ui.channelTab = button.dataset.channelTab;
        ensureChannelSecretTabs();
      };
    });
  }

  function compactChannelsConnectionPanel() {
    const panel = document.querySelector('[data-view-panel="channels"] .panel-connection');
    if (!panel) return;
    panel.classList.add("compact-connection");
  }

  async function refreshTokens() {
    const data = await getJson(`/api/tokens/usage?days=${ui.tokenDays}&configured_only=${ui.tokenConfiguredOnly ? 1 : 0}`);
    renderTokens(data);
  }

  function matchesPrimaryModel(primaryModel, item) {
    if (!primaryModel || !item?.model) return false;
    return primaryModel === item.model || primaryModel.endsWith(`/${item.model}`);
  }

  function syncPreferredTokenModel(data) {
    const modelOptions = data.series?.models || [];
    if (!modelOptions.length) {
      ui.tokenSelectedModel = "all";
      return;
    }
    if (ui.tokenSelectedModel === "all" && ui.tokenModelPinned) {
      return;
    }
    const preferred = modelOptions.find((item) => matchesPrimaryModel(store.status?.primaryModel || "", item));
    if (!ui.tokenModelPinned && preferred?.model) {
      ui.tokenSelectedModel = preferred.model;
      return;
    }
    if (ui.tokenSelectedModel !== "all" && modelOptions.some((item) => item.model === ui.tokenSelectedModel)) {
      return;
    }
    ui.tokenSelectedModel = preferred?.model || modelOptions[0].model || "all";
  }

  function enrichTokenModels(data) {
    const configuredSet = new Set((data.configuredModels || []).map((item) => `${item.provider}::${item.model}`));
    return (data.models || []).map((item) => {
      const configured = configuredSet.has(`${item.provider}::${item.model}`);
      const hasUsage = Number(item.totalTokens || 0) > 0 || Number(item.calls || 0) > 0;
      const isPrimary = matchesPrimaryModel(store.status?.primaryModel || "", item);
      return {
        ...item,
        configured,
        hasUsage,
        isPrimary,
        statusLabel: configured ? (hasUsage ? "已配置，有用量" : "已配置，暂无用量") : "未配置",
      };
    });
  }

  function getSelectedTokenSeries(data) {
    const models = data.series?.models || [];
    if (ui.tokenSelectedModel === "all") return data.series?.all || { label: "全部模型", dailyTokens: [] };
    return models.find((item) => item.model === ui.tokenSelectedModel) || data.series?.all || { label: "全部模型", dailyTokens: [] };
  }

  function buildTokenChartSvg(timeline, values) {
    const width = 640;
    const height = 220;
    const top = 20;
    const right = 20;
    const bottom = 34;
    const left = 44;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxValue = Math.max(...values, 0);
    const safeMax = maxValue > 0 ? maxValue : 1;
    const stepX = values.length > 1 ? plotWidth / (values.length - 1) : 0;
    const point = (value, index) => {
      const x = left + index * stepX;
      const y = top + plotHeight - (value / safeMax) * plotHeight;
      return `${x},${y}`;
    };
    const polyline = values.map((value, index) => point(value, index)).join(" ");
    const circles = values
      .map((value, index) => {
        const [x, y] = point(value, index).split(",");
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="#3ddec1"></circle>`;
      })
      .join("");
    const labels = timeline
      .map((item, index) => {
        const x = left + index * stepX;
        return `<text x="${x}" y="${height - 10}" fill="rgba(220,234,245,0.72)" font-size="11" text-anchor="middle">${esc(item.label)}</text>`;
      })
      .join("");
    const ticks = [0, 0.5, 1]
      .map((ratio) => {
        const value = Math.round(safeMax * (1 - ratio));
        const y = top + plotHeight * ratio;
        return `
          <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="rgba(130,148,170,0.14)" stroke-dasharray="4 6"></line>
          <text x="${left - 10}" y="${y + 4}" fill="rgba(220,234,245,0.72)" font-size="11" text-anchor="end">${value}</text>
        `;
      })
      .join("");
    return `
      <svg class="token-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Token usage chart">
        ${ticks}
        <polyline fill="none" stroke="#3ddec1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
        ${circles}
        ${labels}
      </svg>
    `;
  }

  function renderTokens(data) {
    store.tokens = data;
    const root = $("#tokens-root");
    if (!root) return;

    syncPreferredTokenModel(data);
    const tokenModels = enrichTokenModels(data);
    const modelOptions = data.series?.models || [];
    const selectedSeries = getSelectedTokenSeries(data);
    const selectedModelMeta = tokenModels.find((item) => item.model === ui.tokenSelectedModel) || null;
    const chartValues = selectedSeries.dailyTokens || [];
    const chartSvg = chartValues.some((value) => value > 0)
      ? buildTokenChartSvg(data.timeline || [], chartValues)
      : '<div class="token-chart-empty">当前筛选条件下还没有可画成折线图的 Token 数据。</div>';

    root.innerHTML = `
      <div class="token-layout">
        <section class="extra-card">
          <div class="extra-kicker">使用概览</div>
          <div class="extra-title">${esc(`${data.rangeDays} 天 Token 统计`)}</div>
          <div class="extra-note">可以切时间范围、切模型，并直接看最近一段时间的用量折线。这样能更快判断哪一个模型在拉高调用量。</div>
          <div class="token-toolbar">
            <button class="mini-button ${ui.tokenDays === 1 ? "active" : ""}" type="button" data-token-days="1">1 天</button>
            <button class="mini-button ${ui.tokenDays === 7 ? "active" : ""}" type="button" data-token-days="7">7 天</button>
            <button class="mini-button ${ui.tokenDays === 30 ? "active" : ""}" type="button" data-token-days="30">30 天</button>
            <input id="token-custom-days" class="inline-number" type="number" min="1" max="365" value="${esc(String(ui.tokenCustomDays))}" />
            <button class="mini-button" type="button" id="apply-token-custom-days">自定义天数</button>
            <label class="inline-check">
              <input id="tokens-configured-only" type="checkbox" ${ui.tokenConfiguredOnly ? "checked" : ""} />
              <span>只看当前已配置模型</span>
            </label>
          </div>
          <div class="extra-grid">
            <div class="extra-item"><div class="extra-label">总 Tokens</div><div class="extra-value">${esc(String(data.summary?.totalTokens || 0))}</div></div>
            <div class="extra-item"><div class="extra-label">输入 Tokens</div><div class="extra-value">${esc(String(data.summary?.inputTokens || 0))}</div></div>
            <div class="extra-item"><div class="extra-label">输出 Tokens</div><div class="extra-value">${esc(String(data.summary?.outputTokens || 0))}</div></div>
            <div class="extra-item"><div class="extra-label">调用次数</div><div class="extra-value">${esc(String(data.summary?.messageCount || 0))}</div></div>
          </div>
          <div class="token-chart-shell">
            <div class="workspace-toolbar">
              <select id="token-model-select" class="inline-select">
                <option value="all">全部模型</option>
                ${modelOptions
                  .map((item) => {
                    const meta = tokenModels.find((entry) => entry.model === item.model);
                    const suffix = meta && !meta.hasUsage ? " · 已配置，暂无用量" : "";
                    return `<option value="${esc(item.model)}" ${ui.tokenSelectedModel === item.model ? "selected" : ""}>${esc(item.provider)} / ${esc(item.model)}${esc(suffix)}</option>`;
                  })
                  .join("")}
              </select>
            </div>
            ${
              selectedModelMeta
                ? `<div class="token-model-note">当前模型：${esc(selectedModelMeta.provider)} / ${esc(selectedModelMeta.model)}，${esc(selectedModelMeta.statusLabel)}${selectedModelMeta.isPrimary ? "，也是当前主模型" : ""}。</div>`
                : '<div class="token-model-note">当前展示全部模型的合计折线。已保存 API 但暂无调用的模型，也会出现在已配置列表里。</div>'
            }
            ${chartSvg}
            <div class="token-chart-legend">
              <span>当前折线：${esc(selectedSeries.label || "全部模型")}</span>
              <span>峰值：${esc(String(Math.max(...chartValues, 0)))}</span>
            </div>
          </div>
        </section>
        <section class="extra-card">
          <div class="extra-kicker">模型分布</div>
          ${
            data.models?.length
              ? `
                <table class="token-table">
                  <thead><tr><th>Provider</th><th>模型</th><th>总 Tokens</th><th>调用次数</th></tr></thead>
                  <tbody>
                    ${tokenModels
                      .map(
                        (item) => `
                          <tr class="${ui.tokenSelectedModel === item.model ? "is-selected" : ""}" data-token-model="${esc(item.model)}">
                            <td>${esc(item.provider)}</td>
                            <td>
                              <div class="token-model-title">
                                <span>${esc(item.model)}</span>
                                ${item.isPrimary ? '<span class="soft-badge good">当前主模型</span>' : ""}
                              </div>
                              <div class="token-row-meta">
                                <span class="soft-badge ${item.hasUsage ? "good" : "muted"}">${esc(item.statusLabel)}</span>
                              </div>
                            </td>
                            <td>${esc(String(item.totalTokens || 0))}</td>
                            <td>${esc(String(item.calls || 0))}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
              : '<div class="empty-state clean">当前时间窗口内没有可显示的 Token 数据。</div>'
          }
        </section>
      </div>
    `;

    $$("[data-token-days]", root).forEach((button) => {
      button.addEventListener("click", () => {
        ui.tokenDays = Number(button.dataset.tokenDays);
        refreshTokens().catch(reportError);
      });
    });
    $("#apply-token-custom-days", root)?.addEventListener("click", () => {
      const nextValue = Number($("#token-custom-days", root)?.value || ui.tokenCustomDays);
      ui.tokenCustomDays = Math.min(365, Math.max(1, nextValue || 1));
      ui.tokenDays = ui.tokenCustomDays;
      refreshTokens().catch(reportError);
    });
    $("#tokens-configured-only", root)?.addEventListener("change", (event) => {
      ui.tokenConfiguredOnly = event.target.checked;
      refreshTokens().catch(reportError);
    });
    $("#token-model-select", root)?.addEventListener("change", (event) => {
      ui.tokenSelectedModel = event.target.value;
      ui.tokenModelPinned = true;
      renderTokens(store.tokens);
    });
    $$("[data-token-model]", root).forEach((row) => {
      row.addEventListener("click", () => {
        ui.tokenSelectedModel = row.dataset.tokenModel;
        ui.tokenModelPinned = true;
        renderTokens(store.tokens);
      });
    });
  }

  async function refreshPermissions() {
    const data = await getJson("/api/permissions");
    renderPermissions(data);
  }

  function mergePickedPaths(targetId, pickedPaths) {
    const textarea = document.getElementById(targetId);
    if (!textarea) return;
    const current = (textarea.value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    const merged = Array.from(new Set([...current, ...pickedPaths]));
    textarea.value = merged.join("\n");
  }

  async function pickPermissionPaths(targetId, kind) {
    window.setBusy?.(true, "正在打开本地选择器...");
    try {
      const response = await window.request("/api/permissions/pick-paths", {
        method: "POST",
        body: JSON.stringify({ kind }),
      });
      const paths = response.data?.paths || [];
      if (response.data?.cancelled) {
        window.setResult?.("已取消选择。");
        return;
      }
      mergePickedPaths(targetId, paths);
      window.setResult?.(`已加入 ${paths.length} 个路径。`);
    } finally {
      window.setBusy?.(false);
    }
  }

  async function savePermissions() {
    const payload = {
      mode: $("input[name='permission-mode']:checked")?.value || "restricted",
      sandboxMode: $("#permission-sandbox-mode")?.value || "off",
      execAsk: $("#permission-exec-ask")?.value || "on-miss",
      allowedDirs: ($("#permission-allowed-dirs")?.value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      execDirs: ($("#permission-exec-dirs")?.value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      extraDirs: ($("#permission-extra-dirs")?.value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    };
    window.setBusy?.(true, "正在保存权限策略...");
    try {
      const response = await window.request("/api/permissions/save", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      window.setResult?.(response.message);
      await Promise.all([refreshPermissions(), window.refreshLogs?.()]);
    } finally {
      window.setBusy?.(false);
    }
  }

  function renderPermissionTextArea(title, id, values) {
    return `
      <div class="extra-item permission-area">
        <div class="extra-label">${title}</div>
        <textarea id="${id}" class="textarea-clean">${esc((values || []).join("\n"))}</textarea>
        <div class="picker-actions">
          <button class="mini-button" type="button" data-permission-pick="${id}" data-pick-kind="directory">选择目录</button>
          <button class="mini-button" type="button" data-permission-pick="${id}" data-pick-kind="file">选择文件</button>
        </div>
      </div>
    `;
  }

  function renderPermissions(data) {
    store.permissions = data;
    const root = $("#permissions-root");
    if (!root) return;
    const scope = data.scope || {};
    const presets = data.presets || [];
    const mounts = data.mounts || [];

    root.innerHTML = `
      <section class="extra-card">
        <div class="extra-kicker">当前状态</div>
        <div class="extra-title">${esc(scope.mode === "full" ? "最高权限模式" : "白名单模式")}</div>
        <div class="extra-note">${esc(data.summary || "")}</div>
        <div class="extra-grid">
          <div class="extra-item"><div class="extra-label">配置文件</div><div class="extra-value">${esc(data.configPath || "未找到")}</div></div>
          <div class="extra-item"><div class="extra-label">挂载目录</div><div class="extra-value">${esc(data.mountsRoot || "未设置")}</div></div>
        </div>
        <div class="permission-presets">
          ${presets.map((item) => `<button class="mini-button" type="button" data-permission-preset="${esc(item.path)}">${esc(item.label)}</button>`).join("")}
        </div>
      </section>
      <section class="extra-card">
        <div class="extra-kicker">权限编辑</div>
        <div class="extra-actions">
          <label class="inline-check"><input type="radio" name="permission-mode" value="full" ${scope.mode === "full" ? "checked" : ""} /><span>最高权限</span></label>
          <label class="inline-check"><input type="radio" name="permission-mode" value="restricted" ${scope.mode !== "full" ? "checked" : ""} /><span>白名单模式</span></label>
        </div>
        <div class="extra-grid">
          <div class="extra-item">
            <div class="extra-label">Sandbox 模式</div>
            <select id="permission-sandbox-mode" class="inline-select">
              <option value="off" ${scope.sandboxMode === "off" ? "selected" : ""}>off</option>
              <option value="non-main" ${scope.sandboxMode === "non-main" ? "selected" : ""}>non-main</option>
              <option value="all" ${scope.sandboxMode === "all" ? "selected" : ""}>all</option>
            </select>
          </div>
          <div class="extra-item">
            <div class="extra-label">命令审批</div>
            <select id="permission-exec-ask" class="inline-select">
              <option value="on" ${scope.execAsk === "on" ? "selected" : ""}>on</option>
              <option value="on-miss" ${scope.execAsk === "on-miss" ? "selected" : ""}>on-miss</option>
              <option value="off" ${scope.execAsk === "off" ? "selected" : ""}>off</option>
            </select>
          </div>
        </div>
        <div class="extra-grid">
          ${renderPermissionTextArea("文件白名单", "permission-allowed-dirs", scope.allowedDirs)}
          ${renderPermissionTextArea("可执行目录", "permission-exec-dirs", scope.execDirs)}
          ${renderPermissionTextArea("额外访问目录", "permission-extra-dirs", scope.extraDirs)}
        </div>
        <div class="extra-actions"><button class="action-button action-primary" id="save-permissions" type="button">保存权限策略</button></div>
      </section>
      <section class="extra-card">
        <div class="extra-kicker">当前挂载结果</div>
        ${
          mounts.length
            ? mounts
                .map((item) => `<div class="extra-item"><div class="extra-label">${item.exists ? "已映射" : "路径不存在"}</div><div class="extra-value">${esc(item.path)}</div>${item.mountPath ? `<div class="doc-path">${esc(item.mountPath)}</div>` : ""}</div>`)
                .join("")
            : '<div class="empty-state clean">当前没有额外挂载路径。切到白名单模式并保存后，这里会显示实际映射结果。</div>'
        }
      </section>
    `;

    $("#save-permissions", root)?.addEventListener("click", () => savePermissions().catch(reportError));
    $$("[data-permission-preset]", root).forEach((button) => {
      button.addEventListener("click", () => mergePickedPaths("permission-allowed-dirs", [button.dataset.permissionPreset]));
    });
    $$("[data-permission-pick]", root).forEach((button) => {
      button.addEventListener("click", () => pickPermissionPaths(button.dataset.permissionPick, button.dataset.pickKind).catch(reportError));
    });
  }

  async function refreshCoreDocs() {
    store.coreDocs = await getJson("/api/core-docs");
    if (!store.currentDoc && store.coreDocs.length) {
      const preferred = store.coreDocs.find((item) => item.exists) || store.coreDocs[0];
      await loadCoreDoc(preferred.name);
      return;
    }
    renderWorkspace();
  }

  async function loadCoreDoc(name) {
    try {
      const response = await window.request(`/api/core-docs/read?name=${encodeURIComponent(name)}`);
      store.currentDoc = response.data;
    } catch (error) {
      store.currentDoc = { name, content: "", missing: true, path: "" };
    }
    renderWorkspace();
  }

  async function saveCurrentDoc() {
    const name = store.currentDoc?.name;
    if (!name) return;
    const content = $("#workspace-doc-editor")?.value || "";
    window.setBusy?.(true, `正在保存 ${name}...`);
    try {
      const response = await window.request("/api/core-docs/save", {
        method: "POST",
        body: JSON.stringify({ name, content }),
      });
      window.setResult?.(response.message);
      await refreshCoreDocs();
      await loadCoreDoc(name);
    } finally {
      window.setBusy?.(false);
    }
  }

  async function createDefaultDoc(name) {
    window.setBusy?.(true, `正在补齐 ${name} 默认模板...`);
    try {
      const response = await window.request("/api/core-docs/create-default", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      window.setResult?.(response.message);
      await refreshCoreDocs();
      await loadCoreDoc(name);
    } finally {
      window.setBusy?.(false);
    }
  }

  async function createMissingDocs() {
    window.setBusy?.(true, "正在补齐缺失核心文件...");
    try {
      const response = await window.request("/api/core-docs/create-missing-defaults", {
        method: "POST",
        body: "{}",
      });
      window.setResult?.(response.message);
      await refreshCoreDocs();
    } finally {
      window.setBusy?.(false);
    }
  }

  async function refreshSkills() {
    store.skills = await getJson("/api/skills");
    renderWorkspace();
  }

  async function refreshMaintenance() {
    store.maintenance = await getJson("/api/workspace/maintenance");
    renderWorkspace();
  }

  async function searchOnlineSkills() {
    const query = (ui.onlineSkillQuery || "").trim();
    if (!query) {
      store.onlineSkillResults = [];
      renderWorkspace();
      return;
    }
    window.setBusy?.(true, "正在搜索在线 skill...");
    try {
      const response = await window.request(`/api/skills/search-online?q=${encodeURIComponent(query)}`);
      store.onlineSkillResults = response.data?.results || [];
      renderWorkspace();
    } finally {
      window.setBusy?.(false);
    }
  }

  async function installSkillFromSource(name, source) {
    window.setBusy?.(true, `正在安装 ${name}...`);
    try {
      const response = await window.request("/api/skills/install", {
        method: "POST",
        body: JSON.stringify({ name, source }),
      });
      window.setResult?.(response.message);
      await refreshSkills();
    } finally {
      window.setBusy?.(false);
    }
  }

  async function installSkillFromPath() {
    const path = $("#skill-install-path")?.value?.trim();
    if (!path) return window.setResult?.("请先填写本地 skill 路径。");
    window.setBusy?.(true, "正在从本地路径安装 skill...");
    try {
      const response = await window.request("/api/skills/install-path", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      window.setResult?.(response.message);
      await refreshSkills();
    } finally {
      window.setBusy?.(false);
    }
  }

  async function installSkillFromRepo(repoUrl) {
    const target = repoUrl || $("#skill-install-repo")?.value?.trim();
    if (!target) return window.setResult?.("请先填写 skill 仓库地址。");
    window.setBusy?.(true, "正在从仓库安装 skill...");
    try {
      const response = await window.request("/api/skills/install-repo", {
        method: "POST",
        body: JSON.stringify({ repoUrl: target }),
      });
      window.setResult?.(response.message);
      await refreshSkills();
    } finally {
      window.setBusy?.(false);
    }
  }

  async function uninstallSkill(name) {
    window.setBusy?.(true, `正在卸载 ${name}...`);
    try {
      const response = await window.request("/api/skills/uninstall", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      window.setResult?.(response.message);
      await refreshSkills();
    } finally {
      window.setBusy?.(false);
    }
  }

  async function executeWorkspaceMaintenance(action) {
    const expected = action === "reset" ? "RESET" : "UNINSTALL OPENCLAW";
    const current = $(`#workspace-${action}-confirm`)?.value?.trim() || "";
    if (current !== expected) {
      window.setResult?.(`??? ${expected} ?????`);
      return;
    }
    const label = action === "reset" ? "?? OpenClaw ???" : "???? OpenClaw";
    window.setBusy?.(true, `???? ${label}...`);
    try {
      const response = await window.request(`/api/workspace/${action}`, {
        method: "POST",
        body: "{}",
      });
      window.setResult?.(response.message);
      await Promise.all([
        window.refreshStatus?.(),
        window.refreshSetupGuide?.(),
        window.refreshSelfCheck?.(),
        refreshPermissions(),
        refreshWorkspace(),
      ]);
    } finally {
      window.setBusy?.(false);
    }
  }

  function legacySetupWorkspaceTabs(root) {
    const layout = $(".workspace-layout", root);
    if (!layout) return;
    layout.style.display = "block";
    layout.classList.add("workspace-tabbed");

    let tabs = $("#workspace-main-tabs", root);
    if (!tabs) {
      tabs = document.createElement("div");
      tabs.id = "workspace-main-tabs";
      tabs.className = "workspace-subtabs";
      tabs.innerHTML = `
        <button class="workspace-subtab" type="button" data-workspace-tab="docs">核心 .md</button>
        <button class="workspace-subtab" type="button" data-workspace-tab="skills">Skills</button>
      `;
      root.prepend(tabs);
    }

    const cards = Array.from(layout.querySelectorAll(":scope > section.extra-card"));
    const docsCard = cards[0];
    const skillsCard = cards[1];
    if (!docsCard || !skillsCard) return;

    docsCard.dataset.workspacePanel = "docs";
    skillsCard.dataset.workspacePanel = "skills";
    docsCard.classList.add("workspace-subpanel");
    skillsCard.classList.add("workspace-subpanel");
    docsCard.classList.toggle("active", ui.workspaceTab === "docs");
    skillsCard.classList.toggle("active", ui.workspaceTab === "skills");

    $$("[data-workspace-tab]", tabs).forEach((button) => {
      button.classList.toggle("active", button.dataset.workspaceTab === ui.workspaceTab);
      button.onclick = () => {
        ui.workspaceTab = button.dataset.workspaceTab;
        renderWorkspace();
      };
    });
  }

  function setupWorkspaceDocPane(root) {
    const docsCard = $("[data-workspace-panel='docs']", root);
    if (!docsCard) return;
    const columns = $(".workspace-columns", docsCard);
    if (!columns) return;
    const left = columns.children[0];
    const right = columns.children[1];
    if (!left || !right) return;

    left.classList.add("workspace-list-shell");
    right.classList.add("workspace-editor-stack");
    $("#workspace-doc-editor", right)?.classList.add("workspace-doc-editor");

    let search = $("#doc-query", left);
    if (!search) {
      search = document.createElement("input");
      search.id = "doc-query";
      search.className = "search-input-clean";
      search.type = "text";
      search.placeholder = "搜索文件名、标签或说明";
      left.prepend(search);
    }
    search.value = ui.docQuery;

    let scroller = $(".workspace-list-scroll", left);
    if (!scroller) {
      scroller = document.createElement("div");
      scroller.className = "workspace-list-scroll";
      const docCards = Array.from(left.querySelectorAll(".doc-card-clean"));
      const anchor = docCards[0] || null;
      if (anchor) {
        left.insertBefore(scroller, anchor);
        docCards.forEach((card) => scroller.appendChild(card));
      }
    }

    const query = ui.docQuery.trim().toLowerCase();
    const docCards = $$(".doc-card-clean", left);
    let visibleCount = 0;
    docCards.forEach((card) => {
      const matched = !query || card.textContent.toLowerCase().includes(query);
      card.style.display = matched ? "" : "none";
      if (matched) visibleCount += 1;
    });

    let empty = $("#doc-query-empty", left);
    if (!empty) {
      empty = document.createElement("div");
      empty.id = "doc-query-empty";
      empty.className = "empty-state clean";
      empty.textContent = "当前搜索条件下没有匹配的核心文件。";
      scroller.appendChild(empty);
    }
    empty.style.display = visibleCount ? "none" : "";

    search.oninput = (event) => {
      ui.docQuery = event.target.value;
      renderWorkspace();
    };
  }

  function legacySetupWorkspaceSkillPane(root) {
    const skillsCard = $("[data-workspace-panel='skills']", root);
    if (!skillsCard) return;
    const columns = $(".workspace-columns", skillsCard);
    if (!columns) return;
    const left = columns.children[0];
    const right = columns.children[1];
    if (!left || !right) return;

    left.classList.add("workspace-list-shell");
    right.classList.add("workspace-editor-stack");

    let leftScroller = $(".workspace-list-scroll", left);
    if (!leftScroller) {
      leftScroller = document.createElement("div");
      leftScroller.className = "workspace-list-scroll";
      const movable = Array.from(left.children).filter((node) => !node.matches?.("#skill-query"));
      const anchor = movable[0] || null;
      if (anchor) {
        left.insertBefore(leftScroller, anchor);
        movable.forEach((node) => leftScroller.appendChild(node));
      }
    }

    const onlineSearchCard = Array.from(right.querySelectorAll(".extra-item")).find((item) => item.textContent.includes("在线"));
    let rightScroller = $(".workspace-list-scroll", right);
    if (!rightScroller) {
      rightScroller = document.createElement("div");
      rightScroller.className = "workspace-list-scroll";
      const movable = Array.from(right.children).filter((node) => node !== onlineSearchCard);
      const anchor = movable[0] || null;
      if (anchor) {
        right.insertBefore(rightScroller, anchor);
        movable.forEach((node) => rightScroller.appendChild(node));
      }
    } else if (onlineSearchCard) {
      const movable = Array.from(right.children).filter((node) => node !== onlineSearchCard && node !== rightScroller);
      movable.forEach((node) => rightScroller.appendChild(node));
      right.insertBefore(rightScroller, onlineSearchCard);
    }

    if (onlineSearchCard && !$(".workspace-list-scroll", onlineSearchCard)) {
      const resultsScroller = document.createElement("div");
      resultsScroller.className = "workspace-list-scroll";
      const movable = Array.from(onlineSearchCard.children).filter((node) => !node.matches?.(".extra-label, .inline-form"));
      if (movable.length) {
        onlineSearchCard.appendChild(resultsScroller);
        movable.forEach((node) => resultsScroller.appendChild(node));
      }
    }

    $$("[data-skill-install]", skillsCard).forEach((button) => {
      button.textContent = "安装到 OpenClaw";
    });

    $("#skill-query", skillsCard)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        ui.skillQuery = event.target.value;
        renderWorkspace();
      }
    });
    $("#online-skill-query", skillsCard)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        ui.onlineSkillQuery = event.target.value;
        searchOnlineSkills().catch(reportError);
      }
    });
  }

  function legacyRenderWorkspace() {
    const root = $("#workspace-root");
    if (!root) return;

    const docs = store.coreDocs || [];
    const currentDoc = store.currentDoc;
    const skills = store.skills || { installed: [], available: [] };
    const availableSkills = (skills.available || []).filter((item) => {
      const query = ui.skillQuery.trim().toLowerCase();
      if (!query) return true;
      return `${item.name} ${item.source} ${item.preview}`.toLowerCase().includes(query);
    });
    const installedSkills = (skills.installed || []).filter((item) => {
      const query = ui.skillQuery.trim().toLowerCase();
      if (!query) return true;
      return `${item.name} ${item.path} ${item.preview}`.toLowerCase().includes(query);
    });
    const currentDocText = currentDoc?.content || "";

    root.innerHTML = `
      <div id="workspace-main-tabs" class="workspace-subtabs">
        <button class="workspace-subtab ${ui.workspaceTab === "docs" ? "active" : ""}" type="button" data-workspace-tab="docs">核心 .md</button>
        <button class="workspace-subtab ${ui.workspaceTab === "skills" ? "active" : ""}" type="button" data-workspace-tab="skills">Skills</button>
        <button class="workspace-subtab ${ui.workspaceTab === "ops" ? "active" : ""}" type="button" data-workspace-tab="ops">维护</button>
      </div>
      <div class="workspace-layout">
        <section class="extra-card">
          <div class="extra-kicker">核心 .md 文件</div>
          <div class="extra-title">工作区大脑文件</div>
          <div class="extra-note">这里直接管理 OpenClaw 最重要的核心文档。人格、规则、记忆和启动链路，都从这里改。</div>
          <div class="workspace-toolbar">
            <button class="mini-button" type="button" id="create-missing-core-docs">补齐缺失模板</button>
          </div>
          <div class="workspace-columns">
            <div class="workspace-stack">
              ${docs
                .map(
                  (item) => `
                    <div class="doc-card-clean ${currentDoc?.name === item.name ? "active" : ""}" data-core-doc="${esc(item.name)}">
                      <div class="doc-card-head">
                        <strong>${esc(item.name)}</strong>
                        <span class="soft-badge ${item.exists ? "good" : "warn"}">${item.exists ? "已存在" : "缺失"}</span>
                      </div>
                      <div class="doc-path">${esc(item.description)}</div>
                      <div class="doc-meta">
                        <span class="soft-badge">${esc(item.label)}</span>
                        <span class="soft-badge">${item.updatedAt ? esc(item.updatedAt) : "尚未创建"}</span>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
            <div class="workspace-stack">
              <div class="extra-item">
                <div class="extra-label">当前文件</div>
                <div class="extra-value">${esc(currentDoc?.name || "尚未选择")}</div>
                <div class="doc-path">${esc(currentDoc?.path || "")}</div>
              </div>
              <textarea id="workspace-doc-editor" class="textarea-clean" placeholder="先从左边选择一个核心 .md 文件">${esc(currentDocText)}</textarea>
              <div class="workspace-toolbar">
                <button class="action-button action-primary" type="button" id="save-core-doc" ${currentDoc ? "" : "disabled"}>保存</button>
                <button class="mini-button" type="button" id="reload-core-doc" ${currentDoc ? "" : "disabled"}>重新读取</button>
                <button class="mini-button" type="button" id="create-default-doc" ${currentDoc ? "" : "disabled"}>写入默认模板</button>
              </div>
            </div>
          </div>
        </section>
        <section class="extra-card">
          <div class="extra-kicker">Skill 管理</div>
          <div class="extra-title">安装、同步、搜索与预览</div>
          <div class="extra-note">这里会同步本机 ~/.openclaw/skills 的已装状态，也会显示 .agents 和 .codex 两套本地来源，还能搜 GitHub 上的在线资源。</div>
          <input id="skill-query" class="search-input-clean" type="text" placeholder="搜索本地 skill 名称、来源或说明" value="${esc(ui.skillQuery)}" />
          <div class="workspace-columns">
            <div class="workspace-stack">
              <div class="extra-item"><div class="extra-label">已安装</div><div class="extra-value">${installedSkills.length} 个</div></div>
              ${
                installedSkills.length
                  ? installedSkills
                      .map(
                        (item) => `
                          <div class="skill-card">
                            <div class="skill-card-head"><strong>${esc(item.name)}</strong><span class="soft-badge good">已安装</span></div>
                            <div class="skill-path">${esc(item.path)}</div>
                            <div class="skill-actions">
                              <button class="mini-button" type="button" data-skill-preview="${esc(item.preview || "")}">预览</button>
                              <button class="mini-button" type="button" data-skill-uninstall="${esc(item.name)}">卸载</button>
                            </div>
                          </div>
                        `
                      )
                      .join("")
                  : '<div class="empty-state clean">当前还没有安装到 OpenClaw 的 skill。</div>'
              }
              <div class="extra-item">
                <div class="extra-label">本地安装器</div>
                <div class="inline-form">
                  <input id="skill-install-path" class="inline-input" type="text" placeholder="粘贴本地 skill 目录路径" />
                  <button class="mini-button" type="button" id="install-skill-path">从路径安装</button>
                </div>
                <div class="inline-form">
                  <input id="skill-install-repo" class="inline-input" type="text" placeholder="粘贴 GitHub 仓库 URL" />
                  <button class="mini-button" type="button" id="install-skill-repo">从仓库安装</button>
                </div>
              </div>
            </div>
            <div class="workspace-stack">
              <div class="extra-item"><div class="extra-label">本地候选来源</div><div class="extra-value">${availableSkills.length} 个可见条目</div></div>
              ${
                availableSkills.length
                  ? availableSkills
                      .map(
                        (item) => `
                          <div class="skill-card">
                            <div class="skill-card-head"><strong>${esc(item.name)}</strong><span class="soft-badge ${item.installed ? "good" : ""}">${esc(item.source)}</span></div>
                            <div class="skill-description">${esc(item.preview ? item.preview.slice(0, 180) : "暂无预览")}</div>
                            <div class="skill-actions">
                              <button class="mini-button" type="button" data-skill-preview="${esc(item.preview || "")}">预览</button>
                              ${
                                item.installed
                                  ? `<button class="mini-button" type="button" data-skill-uninstall="${esc(item.name)}">卸载已安装版本</button>`
                                  : `<button class="mini-button" type="button" data-skill-install="${esc(item.name)}" data-skill-source="${esc(item.source)}">安装</button>`
                              }
                            </div>
                          </div>
                        `
                      )
                      .join("")
                  : '<div class="empty-state clean">当前搜索条件下没有本地候选 skill。</div>'
              }
              <div class="extra-item">
                <div class="extra-label">在线搜索</div>
                <div class="inline-form">
                  <input id="online-skill-query" class="inline-input" type="text" placeholder="例如 skill security github search" value="${esc(ui.onlineSkillQuery)}" />
                  <button class="mini-button" type="button" id="search-online-skills">搜索在线资源</button>
                </div>
                ${
                  store.onlineSkillResults.length
                    ? store.onlineSkillResults
                        .map(
                          (item) => `
                            <div class="skill-card">
                              <div class="skill-card-head"><strong>${esc(item.fullName)}</strong><span class="soft-badge">${item.matchType === "code" ? "命中 SKILL.md" : "仓库结果"}</span></div>
                              <div class="skill-description">${esc(item.description || "暂无描述")}</div>
                              <div class="doc-meta"><span class="soft-badge">★ ${esc(String(item.stars || 0))}</span><span class="soft-badge">${esc(item.updatedAt || "")}</span></div>
                              ${item.skillPath ? `<div class="skill-path">命中路径：${esc(item.skillPath)}</div>` : ""}
                              <div class="skill-actions">
                                <a class="mini-button" href="${esc(item.htmlUrl)}" target="_blank" rel="noreferrer">打开仓库</a>
                                <button class="mini-button" type="button" data-online-install="${esc(item.cloneUrl)}">从这个仓库安装</button>
                              </div>
                            </div>
                          `
                        )
                        .join("")
                    : '<div class="empty-state clean">在线结果会显示在这里。你可以直接从结果里的仓库一键安装。</div>'
                }
              </div>
              <div class="extra-item">
                <div class="extra-label">预览</div>
                <div class="preview-box">${esc(store.skillPreview || "点击任意 skill 的“预览”，这里会显示它的 SKILL.md 摘要。")}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    setupWorkspaceTabs(root);
    setupWorkspaceDocPane(root);
    setupWorkspaceSkillPane(root);

    $$("[data-core-doc]", root).forEach((card) => {
      card.addEventListener("click", () => loadCoreDoc(card.dataset.coreDoc).catch(reportError));
    });
    $("#save-core-doc", root)?.addEventListener("click", () => saveCurrentDoc().catch(reportError));
    $("#reload-core-doc", root)?.addEventListener("click", () => loadCoreDoc(store.currentDoc?.name).catch(reportError));
    $("#create-default-doc", root)?.addEventListener("click", () => createDefaultDoc(store.currentDoc?.name).catch(reportError));
    $("#create-missing-core-docs", root)?.addEventListener("click", () => createMissingDocs().catch(reportError));
    $("#skill-query", root)?.addEventListener("input", (event) => {
      ui.skillQuery = event.target.value;
      renderWorkspace();
    });
    $("#online-skill-query", root)?.addEventListener("input", (event) => {
      ui.onlineSkillQuery = event.target.value;
    });
    $("#search-online-skills", root)?.addEventListener("click", () => searchOnlineSkills().catch(reportError));
    $("#install-skill-path", root)?.addEventListener("click", () => installSkillFromPath().catch(reportError));
    $("#install-skill-repo", root)?.addEventListener("click", () => installSkillFromRepo().catch(reportError));
    $$("[data-skill-preview]", root).forEach((button) => {
      button.addEventListener("click", () => {
        store.skillPreview = button.dataset.skillPreview || "暂无预览";
        renderWorkspace();
      });
    });
    $$("[data-skill-install]", root).forEach((button) => {
      button.addEventListener("click", () => installSkillFromSource(button.dataset.skillInstall, button.dataset.skillSource).catch(reportError));
    });
    $$("[data-skill-uninstall]", root).forEach((button) => {
      button.addEventListener("click", () => uninstallSkill(button.dataset.skillUninstall).catch(reportError));
    });
    $$("[data-online-install]", root).forEach((button) => {
      button.addEventListener("click", () => installSkillFromRepo(button.dataset.onlineInstall).catch(reportError));
    });
  }

  function setupWorkspaceTabs(root) {
    const layout = $(".workspace-layout", root);
    if (!layout) return;
    layout.style.display = "block";
    layout.classList.add("workspace-tabbed");

    let tabs = $(".workspace-subtabs", layout);
    if (!tabs) {
      tabs = document.createElement("div");
      tabs.className = "workspace-subtabs";
      tabs.innerHTML = `
        <button class="workspace-subtab" type="button" data-workspace-tab="docs">核心 .md</button>
        <button class="workspace-subtab" type="button" data-workspace-tab="skills">Skills</button>
        <button class="workspace-subtab" type="button" data-workspace-tab="ops">维护</button>
      `;
      layout.prepend(tabs);
    }

    const [docsCard, skillsCard, opsCard] = Array.from(layout.querySelectorAll(":scope > section.extra-card"));
    if (!docsCard || !skillsCard || !opsCard) return;

    docsCard.dataset.workspacePanel = "docs";
    skillsCard.dataset.workspacePanel = "skills";
    opsCard.dataset.workspacePanel = "ops";
    [docsCard, skillsCard, opsCard].forEach((card) => card.classList.add("workspace-subpanel"));
    docsCard.classList.toggle("active", ui.workspaceTab === "docs");
    skillsCard.classList.toggle("active", ui.workspaceTab === "skills");
    opsCard.classList.toggle("active", ui.workspaceTab === "ops");

    $$("[data-workspace-tab]", tabs).forEach((button) => {
      button.classList.toggle("active", button.dataset.workspaceTab === ui.workspaceTab);
      button.onclick = () => {
        ui.workspaceTab = button.dataset.workspaceTab;
        renderWorkspace();
      };
    });
  }

  function setupWorkspaceSkillPane(root) {
    const skillsCard = $("[data-workspace-panel='skills']", root);
    if (!skillsCard) return;
    const columns = $(".workspace-columns", skillsCard);
    if (!columns) return;
    const left = columns.children[0];
    const right = columns.children[1];
    if (!left || !right) return;

    left.classList.add("workspace-list-shell");
    right.classList.add("workspace-editor-stack");

    let leftScroller = $(".workspace-list-scroll", left);
    if (!leftScroller) {
      leftScroller = document.createElement("div");
      leftScroller.className = "workspace-list-scroll";
      const movable = Array.from(left.children);
      const anchor = movable[0] || null;
      if (anchor) {
        left.insertBefore(leftScroller, anchor);
        movable.forEach((node) => leftScroller.appendChild(node));
      }
    }

    $$("[data-skill-source-tab]", skillsCard).forEach((button) => {
      button.classList.toggle("active", button.dataset.skillSourceTab === ui.skillSourceTab);
      button.onclick = () => {
        ui.skillSourceTab = button.dataset.skillSourceTab;
        renderWorkspace();
      };
    });

    $$("[data-skill-source-panel]", right).forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.skillSourcePanel === ui.skillSourceTab);
    });

    const localShell = $(".skill-source-scroll", right);
    if (localShell && !$(".workspace-list-scroll", localShell)) {
      const scroller = document.createElement("div");
      scroller.className = "workspace-list-scroll";
      const movable = Array.from(localShell.children);
      const anchor = movable[0] || null;
      if (anchor) {
        localShell.insertBefore(scroller, anchor);
        movable.forEach((node) => scroller.appendChild(node));
      }
    }

    const onlineShell = $(".online-results-shell", right);
    if (onlineShell && !$(".workspace-list-scroll", onlineShell)) {
      const scroller = document.createElement("div");
      scroller.className = "workspace-list-scroll";
      const movable = Array.from(onlineShell.children);
      const anchor = movable[0] || null;
      if (anchor) {
        onlineShell.insertBefore(scroller, anchor);
        movable.forEach((node) => scroller.appendChild(node));
      }
    }

    $("#skill-query", skillsCard)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        ui.skillQuery = event.target.value;
        renderWorkspace();
      }
    });
    $("#online-skill-query", skillsCard)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        ui.onlineSkillQuery = event.target.value;
        searchOnlineSkills().catch(reportError);
      }
    });
  }

  function renderWorkspace() {
    const root = $("#workspace-root");
    if (!root) return;

    const docs = store.coreDocs || [];
    const currentDoc = store.currentDoc;
    const skills = store.skills || { installed: [], available: [] };
    const maintenance = store.maintenance || { reset: { targets: [], keeps: [] }, uninstall: { targets: [], keeps: [] } };
    const query = ui.skillQuery.trim().toLowerCase();
    const availableSkills = (skills.available || []).filter((item) => {
      if (!query) return true;
      return `${item.name} ${item.source} ${item.preview}`.toLowerCase().includes(query);
    });
    const installedSkills = (skills.installed || []).filter((item) => {
      if (!query) return true;
      return `${item.name} ${item.path} ${item.preview}`.toLowerCase().includes(query);
    });
    const currentDocText = currentDoc?.content || "";

    root.innerHTML = `
      <div id="workspace-main-tabs" class="workspace-subtabs">
        <button class="workspace-subtab" type="button" data-workspace-tab="docs">核心 .md</button>
        <button class="workspace-subtab" type="button" data-workspace-tab="skills">Skills</button>
        <button class="workspace-subtab" type="button" data-workspace-tab="ops">维护</button>
      </div>
      <div class="workspace-layout">
        <section class="extra-card">
          <div class="extra-kicker">核心 .md 文件</div>
          <div class="extra-title">工作区大脑文件</div>
          <div class="extra-note">这里直接管理 OpenClaw 最核心的 .md。人格、规则、记忆和启动链路都在这里收口。</div>
          <div class="workspace-toolbar">
            <button class="mini-button" type="button" id="create-missing-core-docs">补齐缺失模板</button>
          </div>
          <div class="workspace-columns">
            <div class="workspace-stack">
              ${docs
                .map(
                  (item) => `
                    <div class="doc-card-clean ${currentDoc?.name === item.name ? "active" : ""}" data-core-doc="${esc(item.name)}">
                      <div class="doc-card-head">
                        <strong>${esc(item.name)}</strong>
                        <span class="soft-badge ${item.exists ? "good" : "warn"}">${item.exists ? "已存在" : "缺失"}</span>
                      </div>
                      <div class="doc-path">${esc(item.description)}</div>
                      <div class="doc-meta">
                        <span class="soft-badge">${esc(item.label)}</span>
                        <span class="soft-badge">${item.updatedAt ? esc(item.updatedAt) : "尚未创建"}</span>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>
            <div class="workspace-stack">
              <div class="extra-item">
                <div class="extra-label">当前文件</div>
                <div class="extra-value">${esc(currentDoc?.name || "尚未选择")}</div>
                <div class="doc-path">${esc(currentDoc?.path || "")}</div>
              </div>
              <textarea id="workspace-doc-editor" class="textarea-clean" placeholder="先从左边选择一个核心 .md 文件">${esc(currentDocText)}</textarea>
              <div class="workspace-toolbar">
                <button class="action-button action-primary" type="button" id="save-core-doc" ${currentDoc ? "" : "disabled"}>保存</button>
                <button class="mini-button" type="button" id="reload-core-doc" ${currentDoc ? "" : "disabled"}>重新读取</button>
                <button class="mini-button" type="button" id="create-default-doc" ${currentDoc ? "" : "disabled"}>写入默认模板</button>
              </div>
            </div>
          </div>
        </section>
        <section class="extra-card">
          <div class="extra-kicker">Skill 管理</div>
          <div class="extra-title">安装、同步、搜索与预览</div>
          <div class="extra-note">左侧只放已安装和本地路径安装器，右侧通过标签切到本地来源或在线来源，不再把候选和搜索结果堆成长页面。</div>
          <input id="skill-query" class="search-input-clean" type="text" placeholder="搜索 skill 名称、来源或说明" value="${esc(ui.skillQuery)}" />
          <div class="workspace-columns">
            <div class="workspace-stack">
              <div class="extra-item"><div class="extra-label">已安装</div><div class="extra-value">${installedSkills.length} 个</div></div>
              ${
                installedSkills.length
                  ? installedSkills
                      .map(
                        (item) => `
                          <div class="skill-card">
                            <div class="skill-card-head"><strong>${esc(item.name)}</strong><span class="soft-badge good">已安装</span></div>
                            <div class="skill-path">${esc(item.path)}</div>
                            <div class="skill-actions">
                              <button class="mini-button" type="button" data-skill-preview="${esc(item.preview || "")}">预览</button>
                              <button class="mini-button" type="button" data-skill-uninstall="${esc(item.name)}">卸载</button>
                            </div>
                          </div>
                        `
                      )
                      .join("")
                  : '<div class="empty-state clean">当前还没有安装到 OpenClaw 的 skill。</div>'
              }
              <div class="extra-item">
                <div class="extra-label">本地安装器</div>
                <div class="inline-form">
                  <input id="skill-install-path" class="inline-input" type="text" placeholder="粘贴本地 skill 目录路径" />
                  <button class="mini-button" type="button" id="install-skill-path">从路径安装</button>
                </div>
              </div>
            </div>
            <div class="workspace-stack">
              <div class="workspace-subtabs">
                <button class="workspace-subtab ${ui.skillSourceTab === "local" ? "active" : ""}" type="button" data-skill-source-tab="local">本地来源</button>
                <button class="workspace-subtab ${ui.skillSourceTab === "online" ? "active" : ""}" type="button" data-skill-source-tab="online">在线来源</button>
              </div>
              <section class="workspace-source-panel ${ui.skillSourceTab === "local" ? "active" : ""}" data-skill-source-panel="local">
                <div class="extra-item"><div class="extra-label">本地候选来源</div><div class="extra-value">${availableSkills.length} 个可见条目</div></div>
                <div class="skill-source-scroll">
                  ${
                    availableSkills.length
                      ? availableSkills
                          .map(
                            (item) => `
                              <div class="skill-card">
                                <div class="skill-card-head"><strong>${esc(item.name)}</strong><span class="soft-badge ${item.installed ? "good" : ""}">${esc(item.source)}</span></div>
                                <div class="skill-description">${esc(item.preview ? item.preview.slice(0, 180) : "暂无预览")}</div>
                                <div class="skill-actions">
                                  <button class="mini-button" type="button" data-skill-preview="${esc(item.preview || "")}">预览</button>
                                  ${
                                    item.installed
                                      ? `<button class="mini-button" type="button" data-skill-uninstall="${esc(item.name)}">卸载已安装版本</button>`
                                      : `<button class="mini-button" type="button" data-skill-install="${esc(item.name)}" data-skill-source="${esc(item.source)}">安装到 OpenClaw</button>`
                                  }
                                </div>
                              </div>
                            `
                          )
                          .join("")
                      : '<div class="empty-state clean">当前搜索条件下没有本地候选 skill。</div>'
                  }
                </div>
              </section>
              <section class="workspace-source-panel ${ui.skillSourceTab === "online" ? "active" : ""}" data-skill-source-panel="online">
                <div class="extra-item">
                  <div class="extra-label">在线来源安装器</div>
                  <div class="inline-form">
                    <input id="skill-install-repo" class="inline-input" type="text" placeholder="粘贴 GitHub 仓库 URL" />
                    <button class="mini-button" type="button" id="install-skill-repo">从仓库安装</button>
                  </div>
                </div>
                <div class="extra-item">
                  <div class="extra-label">在线搜索</div>
                  <div class="inline-form">
                    <input id="online-skill-query" class="inline-input" type="text" placeholder="例如 openclaw skill memory" value="${esc(ui.onlineSkillQuery)}" />
                    <button class="mini-button" type="button" id="search-online-skills">搜索在线资源</button>
                  </div>
                </div>
                <div class="online-results-shell">
                  ${
                    store.onlineSkillResults.length
                      ? store.onlineSkillResults
                          .map(
                            (item) => `
                              <div class="skill-card">
                                <div class="skill-card-head"><strong>${esc(item.fullName)}</strong><span class="soft-badge">${item.matchType === "code" ? "命中 SKILL.md" : "仓库结果"}</span></div>
                                <div class="skill-description">${esc(item.description || "暂无描述")}</div>
                                <div class="doc-meta"><span class="soft-badge">★ ${esc(String(item.stars || 0))}</span><span class="soft-badge">${esc(item.updatedAt || "")}</span></div>
                                ${item.skillPath ? `<div class="skill-path">命中路径：${esc(item.skillPath)}</div>` : ""}
                                <div class="skill-actions">
                                  <a class="mini-button" href="${esc(item.htmlUrl)}" target="_blank" rel="noreferrer">打开仓库</a>
                                  <button class="mini-button" type="button" data-online-install="${esc(item.cloneUrl)}">安装这个在线 Skill</button>
                                </div>
                              </div>
                            `
                          )
                          .join("")
                      : '<div class="empty-state clean">在线结果会显示在这里。搜到可用仓库后，可以直接从结果里安装。</div>'
                  }
                </div>
              </section>
              <div class="extra-item">
                <div class="extra-label">预览</div>
                <div class="preview-box">${esc(store.skillPreview || "点击任意 skill 的“预览”，这里会显示它的 SKILL.md 摘要。")}</div>
              </div>
            </div>
          </div>
        </section>
        <section class="extra-card danger-card">
          <div class="extra-kicker">维护</div>
          <div class="extra-title">重置与完整卸载</div>
          <div class="extra-note">这两个动作只清 OpenClaw 自己的目录、配置、权限映射、环境变量和 npm 全局 openclaw 包，不会删除当前控制台项目、.agents、.codex 或 Node.js 本体。</div>
          <div class="maintenance-list">
            <div class="maintenance-item">
              <div class="extra-label">${esc(maintenance.reset?.title || "重置 OpenClaw 工作区")}</div>
              <div class="danger-note">${esc(maintenance.reset?.summary || "")}</div>
              <div class="maintenance-meta">
                ${(maintenance.reset?.targets || []).map((item) => `<span class="soft-badge ${item.exists ? "warn" : "muted"}">${esc(item.label)}${item.exists ? "" : "（当前不存在）"}</span>`).join("")}
              </div>
              <div class="confirm-row">
                <input id="workspace-reset-confirm" class="inline-input" type="text" placeholder="输入 RESET 才会执行" />
                <button class="mini-button" type="button" id="workspace-reset-action">重置工作区</button>
              </div>
            </div>
            <div class="maintenance-item">
              <div class="extra-label">${esc(maintenance.uninstall?.title || "完整卸载 OpenClaw")}</div>
              <div class="danger-note">${esc(maintenance.uninstall?.summary || "")}</div>
              <div class="maintenance-meta">
                ${(maintenance.uninstall?.targets || []).map((item) => `<span class="soft-badge ${item.exists ? "warn" : "muted"}">${esc(item.label)}${item.exists ? "" : "（当前不存在）"}</span>`).join("")}
              </div>
              <div class="confirm-row">
                <input id="workspace-uninstall-confirm" class="inline-input" type="text" placeholder="输入 UNINSTALL OPENCLAW 才会执行" />
                <button class="mini-button" type="button" id="workspace-uninstall-action">完整卸载</button>
              </div>
            </div>
            <div class="maintenance-item">
              <div class="extra-label">明确保留</div>
              <div class="skill-description">${esc((maintenance.uninstall?.keeps || []).join("\n"))}</div>
            </div>
          </div>
        </section>
      </div>
    `;

    setupWorkspaceTabs(root);
    setupWorkspaceDocPane(root);
    setupWorkspaceSkillPane(root);

    $$("[data-core-doc]", root).forEach((card) => {
      card.addEventListener("click", () => loadCoreDoc(card.dataset.coreDoc).catch(reportError));
    });
    $("#save-core-doc", root)?.addEventListener("click", () => saveCurrentDoc().catch(reportError));
    $("#reload-core-doc", root)?.addEventListener("click", () => loadCoreDoc(store.currentDoc?.name).catch(reportError));
    $("#create-default-doc", root)?.addEventListener("click", () => createDefaultDoc(store.currentDoc?.name).catch(reportError));
    $("#create-missing-core-docs", root)?.addEventListener("click", () => createMissingDocs().catch(reportError));
    $("#skill-query", root)?.addEventListener("input", (event) => {
      ui.skillQuery = event.target.value;
      renderWorkspace();
    });
    $("#online-skill-query", root)?.addEventListener("input", (event) => {
      ui.onlineSkillQuery = event.target.value;
    });
    $("#search-online-skills", root)?.addEventListener("click", () => searchOnlineSkills().catch(reportError));
    $("#install-skill-path", root)?.addEventListener("click", () => installSkillFromPath().catch(reportError));
    $("#install-skill-repo", root)?.addEventListener("click", () => installSkillFromRepo().catch(reportError));
    $("#workspace-reset-action", root)?.addEventListener("click", () => executeWorkspaceMaintenance("reset").catch(reportError));
    $("#workspace-uninstall-action", root)?.addEventListener("click", () => executeWorkspaceMaintenance("uninstall").catch(reportError));
    $$("[data-workspace-tab]", root).forEach((button) => {
      button.addEventListener("click", () => {
        ui.workspaceTab = button.dataset.workspaceTab;
        renderWorkspace();
      });
    });
    $$("[data-skill-source-tab]", root).forEach((button) => {
      button.addEventListener("click", () => {
        ui.skillSourceTab = button.dataset.skillSourceTab;
        renderWorkspace();
      });
    });
    $$("[data-skill-preview]", root).forEach((button) => {
      button.addEventListener("click", () => {
        store.skillPreview = button.dataset.skillPreview || "暂无预览";
        renderWorkspace();
      });
    });
    $$("[data-skill-install]", root).forEach((button) => {
      button.addEventListener("click", () => installSkillFromSource(button.dataset.skillInstall, button.dataset.skillSource).catch(reportError));
    });
    $$("[data-skill-uninstall]", root).forEach((button) => {
      button.addEventListener("click", () => uninstallSkill(button.dataset.skillUninstall).catch(reportError));
    });
    $$("[data-online-install]", root).forEach((button) => {
      button.addEventListener("click", () => installSkillFromRepo(button.dataset.onlineInstall).catch(reportError));
    });
  }

  async function refreshWorkspace() {
    await Promise.all([refreshCoreDocs(), refreshSkills(), refreshMaintenance()]);
  }

  function renderSetupGuideCompletion(data) {
    store.setupGuide = data;
    window.__baseRenderSetupGuide?.(data);
    const summary = data.summary || {};
    const done = summary.totalCount > 0 && summary.completedCount >= summary.totalCount;
    if (!done) return;
    const current = $("#setup-current-step");
    const note = $("#setup-next-note");
    const action = $("#setup-next-action");
    if (current) current.textContent = "当前步骤已完成。";
    if (note) note.textContent = "已完成。";
    if (action) {
      action.hidden = true;
      action.disabled = true;
      action.textContent = "已完成";
    }
  }

  function install() {
    injectStyles();
    ensureTabsAndPanels();

    const baseStatus = window.renderStatus;
    const baseSecrets = window.renderSecrets;
    const baseChannels = window.renderChannels;
    const baseFocusPanel = window.focusPanel;
    window.__baseRenderSetupGuide = window.renderSetupGuide;

    window.renderStatus = (data) => {
      store.status = data;
      baseStatus?.(data);
      if (store.tokens && !ui.tokenModelPinned) {
        renderTokens(store.tokens);
      }
    };
    window.renderSecrets = (data) => {
      store.secrets = data;
      baseSecrets?.(data);
      renderSecretEnhancements();
      ensureChannelSecretTabs();
    };
    window.renderChannels = (data) => {
      store.channels = data;
      baseChannels?.(data);
      renderChannelEnhancements();
      renderSecretEnhancements();
      ensureChannelSecretTabs();
    };
    window.renderSetupGuide = (data) => renderSetupGuideCompletion(data);
    window.focusPanel = (targetId) => {
      if (targetId === "secret-form") ui.channelTab = "secrets";
      if (targetId === "channels-panel") ui.channelTab = "channels";
      if (targetId === "connection-settings-form") ui.channelTab = "connection";
      ensureChannelSecretTabs();
      const result = baseFocusPanel?.(targetId);
      return result;
    };

    const baseOnViewChange = window.onViewChange;
    const loadedHeavyViews = new Set();
    window.onViewChange = async (viewName) => {
      await baseOnViewChange?.(viewName);
      if (viewName === "tokens" && !loadedHeavyViews.has("tokens")) {
        await refreshTokens();
        loadedHeavyViews.add("tokens");
      }
      if (viewName === "permissions" && !loadedHeavyViews.has("permissions")) {
        await refreshPermissions();
        loadedHeavyViews.add("permissions");
      }
      if (viewName === "workspace" && !loadedHeavyViews.has("workspace")) {
        await refreshWorkspace();
        loadedHeavyViews.add("workspace");
      }
    };

    document.title = "OpenClaw 本地控制台";

    compactChannelsConnectionPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
