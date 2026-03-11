const state = {
  profiles: [],
  secrets: [],
  channels: [],
  connectionSettings: null,
  status: null,
  busy: false,
  setupGuide: null,
  configTab: "provider",
  currentView: "overview",
  loadedViews: {},
};

const providerDefaults = {
  google: { profileName: "gemini-new", modelId: "gemini-2.5-pro", alias: "gemini-pro" },
  openai: { profileName: "chatgpt-new", modelId: "gpt-5.4", alias: "chatgpt" },
  anthropic: { profileName: "claude-new", modelId: "claude-sonnet-4-6", alias: "claude-sonnet" },
  "nvidia-kimi": { profileName: "kimi-new", modelId: "moonshotai/kimi-k2-instruct", alias: "kimi" },
  minimax: { profileName: "minimax-new", modelId: "MiniMax-M2.5", alias: "minimax" },
};

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "请求失败");
  }
  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setResult(text, isEmpty = false) {
  const el = document.getElementById("test-result");
  el.textContent = text;
  el.classList.toggle("empty", isEmpty);
}

function setBusy(isBusy, message = "") {
  state.busy = isBusy;
  document.querySelectorAll("button, input, select").forEach((element) => {
    if (element.id === "refresh-logs") return;
    element.disabled = isBusy;
  });
  if (message) {
    setResult(message, false);
  }
}

function flashElement(element) {
  if (!element) return;
  element.classList.add("panel-flash");
  window.setTimeout(() => element.classList.remove("panel-flash"), 1800);
}

function getSecretKeyForProvider(providerKey) {
  return state.secrets.find((item) => item.providerKey === providerKey)?.key || "";
}

function applyGuideTargetContext(action = {}) {
  if (action.configTab) {
    switchConfigTab(action.configTab);
  }

  if (action.providerKey) {
    const providerSelect = document.getElementById("provider-key");
    if (providerSelect && providerSelect.value !== action.providerKey) {
      providerSelect.value = action.providerKey;
      syncProviderFormDefaults();
    }

    const secretKey = getSecretKeyForProvider(action.providerKey);
    const secretSelect = document.getElementById("secret-key");
    if (secretKey && secretSelect) {
      secretSelect.value = secretKey;
    }
  }
}

function navigateToGuideTarget(action = {}) {
  if (!action.target) return;
  applyGuideTargetContext(action);
  focusPanel(action.target, action);
  if (action.note) {
    setResult(action.note);
  }
}

function renderStatus(data) {
  state.status = data;
  document.getElementById("status-dot").className = `status-dot ${data.running ? "ok" : "bad"}`;
  document.getElementById("running-text").textContent = data.running ? "OpenClaw 正在运行" : "OpenClaw 当前未运行";
  document.getElementById("summary-running").textContent = data.running ? "运行中" : "未运行";
  document.getElementById("summary-model").textContent = data.primaryModel || "未设置";
  document.getElementById("summary-provider").textContent = data.providers?.configuredProviders?.join(" / ") || "暂无";
  document.getElementById("summary-channel").textContent = data.channels?.configuredChannels?.join(" / ") || "暂无";
  document.getElementById("badge-health").textContent = data.healthOk ? "健康检查已通过" : (data.healthMessage || "健康检查未通过");
  document.getElementById("badge-profile").textContent = data.activeProfile ? `当前 Profile：${data.activeProfile}` : "当前 Profile 未匹配";

  const rows = [
    ["主模型", data.primaryModel || "未设置"],
    ["当前 Profile", data.activeProfile || "未匹配"],
    ["Agent 超时", data.timeoutSeconds === 0 ? "不限制" : `${data.timeoutSeconds || 600} 秒`],
    ["已配置 Provider", data.providers?.configuredProviders?.join(" / ") || "暂无"],
    ["绑定地址", data.bind || "未知"],
    ["端口", String(data.port || "")],
    ["代理", data.proxy || "未检测到"],
    ["PID", data.pids?.length ? data.pids.join(", ") : "无"],
    ["健康检查", data.healthOk ? "通过" : data.healthMessage || "未通过"],
  ];

  document.getElementById("status-metrics").innerHTML = rows
    .map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");
}

function renderSelfCheck(data) {
  const cards = [
    ["openclaw.json", data.configExists],
    ["Profiles 目录", data.profileDirExists],
    ["Python", data.pythonAvailable],
    ["OpenClaw 命令", data.openclawAvailable],
    ["Node.js", data.nodeExists],
    ["npm", data.npmAvailable],
    ["winget", data.wingetAvailable],
    ["gateway.cmd", data.gatewayScriptExists],
    ["OpenClaw dist 入口", data.openclawDistExists],
  ];

  document.getElementById("self-check-grid").innerHTML =
    cards
      .map(
        ([label, ok]) => `
        <div class="check-card">
          <strong>${label}</strong>
          <span class="status-chip ${ok ? "ok" : "bad"}">${ok ? "正常" : "缺失"}</span>
        </div>`
      )
      .join("") +
    `
      <div class="check-card">
        <strong>系统代理</strong>
        <div>${escapeHtml(data.proxy || "未检测到")}</div>
      </div>
      <div class="check-card">
        <strong>可用 Profile</strong>
        <div>${data.profilesCount}</div>
      </div>
      <div class="check-card">
        <strong>已配置 Provider</strong>
        <div>${escapeHtml(data.configuredProviders?.join(" / ") || "暂无")}</div>
      </div>
      <div class="check-card">
        <strong>配置主模型</strong>
        <div>${escapeHtml(data.primaryModel || "未设置")}</div>
      </div>
    `;
}

function renderSetupGuide(data) {
  state.setupGuide = data;
  const root = document.getElementById("setup-guide-list");
  const note = document.getElementById("window-note");
  const summary = data.summary || {};
  const nextAction = summary.nextAction || {};
  const nextActionButton = document.getElementById("setup-next-action");

  document.getElementById("setup-current-step").textContent = summary.currentStepTitle || "当前没有待处理步骤";
  document.getElementById("setup-progress-count").textContent = `${summary.completedCount || 0} / ${summary.totalCount || 0}`;
  document.getElementById("setup-next-note").textContent = summary.nextActionNote || "现在可以继续做 Provider、通道和链路验证。";
  nextActionButton.textContent = summary.nextActionLabel || "当前无需额外动作";
  nextActionButton.disabled = !summary.nextActionId && !summary.nextActionTarget;
  nextActionButton.onclick = async () => {
    if (summary.nextActionId) {
      try {
        await executeSetupAction(summary.nextActionId);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
      return;
    }

    if (summary.nextActionTarget) {
      navigateToGuideTarget(nextAction);
    }
  };

  document.getElementById("wizard-stepper").innerHTML = (data.steps || [])
    .map(
      (step) => `
      <div class="wizard-step ${step.done ? "done" : step.current ? "current" : ""}">
        <span class="wizard-step-index">${step.index || "-"}</span>
        <div class="wizard-step-copy">
          <strong>${escapeHtml(step.title)}</strong>
          <span>${step.done ? "已完成" : step.current ? "当前步骤" : "待继续"}</span>
        </div>
      </div>`
    )
    .join("");

  root.innerHTML = data.items
    .map(
      (item) => `
      <div class="check-card setup-guide-card ${item.status === "ok" ? "is-ready" : "is-pending"}">
        <div class="setup-guide-head">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="status-chip ${item.status === "ok" ? "ok" : "bad"}">${item.status === "ok" ? "已就绪" : "待处理"}</span>
        </div>
        <div class="setup-guide-summary">${escapeHtml(item.summary)}</div>
        ${
          item.actions?.length
            ? `<div class="setup-actions setup-actions-compact">
                ${item.actions
                  .map((action) => {
                    if (action.actionId) {
                      return `<button class="mini-button ${action.kind === "primary" ? "setup-primary" : ""}" data-setup-action="${escapeHtml(action.actionId)}">${escapeHtml(action.label)}</button>`;
                    }
                    if (action.target) {
                      return `<button class="mini-button ${action.kind === "primary" ? "setup-primary" : ""}" data-setup-target="${escapeHtml(action.target)}" data-setup-config-tab="${escapeHtml(action.configTab || "")}" data-setup-provider-key="${escapeHtml(action.providerKey || "")}" data-setup-channel="${escapeHtml(action.channel || "")}" data-setup-note="${escapeHtml(action.note || "")}">${escapeHtml(action.label)}</button>${action.note ? `<div class="setup-note">${escapeHtml(action.note)}</div>` : ""}`;
                    }

                    const extra = action.url ? `地址：${escapeHtml(action.url)}` : action.note ? escapeHtml(action.note) : "";
                    return `<div class="setup-note"><strong>${escapeHtml(action.label)}</strong>${extra ? `<div>${extra}</div>` : ""}</div>`;
                  })
                  .join("")}
              </div>`
            : ""
        }
      </div>`
    )
    .join("");

  root.querySelectorAll("[data-setup-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await executeSetupAction(button.dataset.setupAction);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });

  root.querySelectorAll("[data-setup-target]").forEach((button) => {
    button.addEventListener("click", () =>
      navigateToGuideTarget({
        target: button.dataset.setupTarget,
        configTab: button.dataset.setupConfigTab,
        providerKey: button.dataset.setupProviderKey,
        channel: button.dataset.setupChannel,
        note: button.dataset.setupNote,
      })
    );
  });

  note.innerHTML = `
    <strong>${escapeHtml(data.windowNote.title)}</strong>
    <div style="margin-top:8px;">${escapeHtml(data.windowNote.summary)}</div>
    <div style="margin-top:10px;">已配置通道：${escapeHtml(data.channels.configuredChannels?.join(" / ") || "暂无")}</div>
  `;
}

function renderProfiles(data) {
  state.profiles = data;
  const root = document.getElementById("profiles-list");
  const select = document.getElementById("model-file-name");

  root.innerHTML = data
    .map(
      (item) => `
      <div class="profile-card">
        <strong>${escapeHtml(item.fileName)}</strong>
        <div>Provider：${escapeHtml(item.providerKey || "无")}</div>
        <div>模型：${escapeHtml(item.modelId || "无")}</div>
        <div>别名：${escapeHtml(item.alias || "无")}</div>
        ${item.error ? `<div class="status-chip bad" style="margin-top:8px;">读取失败：${escapeHtml(item.error)}</div>` : ""}
        <div class="profile-actions">
          <button class="mini-button" data-switch="${escapeHtml(item.fileName)}">应用</button>
          <button class="mini-button" data-fill="${escapeHtml(item.fileName)}">带入模型表单</button>
          <button class="mini-button danger" data-delete="${escapeHtml(item.fileName)}">删除</button>
        </div>
      </div>`
    )
    .join("");

  select.innerHTML = data.map((item) => `<option value="${escapeHtml(item.fileName)}">${escapeHtml(item.fileName)}</option>`).join("");

  root.querySelectorAll("[data-switch]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await applyProfile(button.dataset.switch);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });

  root.querySelectorAll("[data-fill]").forEach((button) => {
    button.addEventListener("click", () => {
      const match = state.profiles.find((item) => item.fileName === button.dataset.fill);
      if (!match) return;
      document.getElementById("model-file-name").value = match.fileName;
      document.getElementById("model-id").value = match.modelId || "";
      document.getElementById("model-alias").value = match.alias || "";
      switchConfigTab("model");
      focusPanel("model-form");
      setResult(`已把 ${match.fileName} 带入模型表单，现在可以直接修改后保存。`);
    });
  });

  root.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await deleteProfile(button.dataset.delete);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });
}

function renderSetupGuide(data) {
  state.setupGuide = data;
  const root = document.getElementById("setup-guide-list");
  const note = document.getElementById("window-note");
  const summary = data.summary || {};
  const nextActionButton = document.getElementById("setup-next-action");

  document.getElementById("setup-current-step").textContent = summary.currentStepTitle || "当前没有待处理步骤";
  document.getElementById("setup-progress-count").textContent = `${summary.completedCount || 0} / ${summary.totalCount || 0}`;
  document.getElementById("setup-next-note").textContent = summary.nextActionNote || "现在可以继续做 Provider、通道和链路验证。";
  nextActionButton.textContent = summary.nextActionLabel || "当前无需额外动作";
  nextActionButton.disabled = !summary.nextActionId && !summary.nextActionTarget;
  nextActionButton.onclick = async () => {
    if (summary.nextActionId) {
      try {
        await executeSetupAction(summary.nextActionId);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
      return;
    }
    if (summary.nextActionTarget) {
      focusPanel(summary.nextActionTarget);
    }
  };

  document.getElementById("wizard-stepper").innerHTML = (data.steps || [])
    .map(
      (step) => `
      <div class="wizard-step ${step.done ? "done" : step.current ? "current" : ""}">
        <span class="wizard-step-index">${step.index || "-"}</span>
        <div class="wizard-step-copy">
          <strong>${escapeHtml(step.title)}</strong>
          <span>${step.done ? "已完成" : step.current ? "当前步骤" : "待继续"}</span>
        </div>
      </div>`
    )
    .join("");

  root.innerHTML = data.items
    .map(
      (item) => `
      <div class="check-card setup-guide-card ${item.status === "ok" ? "is-ready" : "is-pending"}">
        <div class="setup-guide-head">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="status-chip ${item.status === "ok" ? "ok" : "bad"}">${item.status === "ok" ? "已就绪" : "待处理"}</span>
        </div>
        <div class="setup-guide-summary">${escapeHtml(item.summary)}</div>
        ${
          item.actions?.length
            ? `<div class="setup-actions setup-actions-compact">
                ${item.actions
                  .map((action) => {
                    if (action.actionId) {
                      return `<button class="mini-button ${action.kind === "primary" ? "setup-primary" : ""}" data-setup-action="${escapeHtml(action.actionId)}">${escapeHtml(action.label)}</button>`;
                    }
                    if (action.target) {
                      return `<button class="mini-button" data-setup-target="${escapeHtml(action.target)}">${escapeHtml(action.label)}</button>${action.note ? `<div class="setup-note">${escapeHtml(action.note)}</div>` : ""}`;
                    }
                    const extra = action.url ? `地址：${escapeHtml(action.url)}` : action.note ? escapeHtml(action.note) : "";
                    return `<div class="setup-note"><strong>${escapeHtml(action.label)}</strong>${extra ? `<div>${extra}</div>` : ""}</div>`;
                  })
                  .join("")}
              </div>`
            : ""
        }
      </div>`
    )
    .join("");

  root.querySelectorAll("[data-setup-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await executeSetupAction(button.dataset.setupAction);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });

  root.querySelectorAll("[data-setup-target]").forEach((button) => {
    button.addEventListener("click", () => focusPanel(button.dataset.setupTarget));
  });

  note.innerHTML = `
    <strong>${escapeHtml(data.windowNote.title)}</strong>
    <div style="margin-top:8px;">${escapeHtml(data.windowNote.summary)}</div>
    <div style="margin-top:10px;">已配置通道：${escapeHtml(data.channels.configuredChannels?.join(" / ") || "暂无")}</div>
  `;
}

function guideToNextStep(options = {}) {
  const summary = state.setupGuide?.summary || null;
  if (!summary) return;
  if (options.preferTarget && summary.nextActionTarget) {
    focusPanel(summary.nextActionTarget);
    return;
  }
  if (summary.nextActionTarget) {
    focusPanel(summary.nextActionTarget);
  }
}

function getViewForTarget(targetId) {
  const mapping = {
    "provider-wizard-panel": "config",
    "model-form": "config",
    "secret-form": "channels",
    "channels-panel": "channels",
  };
  return mapping[targetId] || "overview";
}

function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === viewName);
  });
  Promise.resolve(window.onViewChange?.(viewName)).catch((error) => {
    setResult(String(error?.message || error));
  });
}

function switchConfigTab(tabName) {
  state.configTab = tabName;
  document.querySelectorAll("[data-config-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.configTab === tabName);
  });
  document.querySelectorAll("[data-config-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.configPanel === tabName);
  });
}

function focusPanel(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  switchView(getViewForTarget(targetId));
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.classList.add("panel-flash");
  window.setTimeout(() => target.classList.remove("panel-flash"), 1800);
}

function renderSecrets(data) {
  state.secrets = data;
  const root = document.getElementById("secrets-list");
  const select = document.getElementById("secret-key");

  root.innerHTML = data
    .map(
      (item) => `
      <div class="secret-card">
        <div class="secret-head">
          <strong>${escapeHtml(item.label)}</strong>
          <span class="status-chip ${item.configured ? "ok" : "bad"}">${item.configured ? "已设置" : "未设置"}</span>
        </div>
        <div class="secret-preview">${escapeHtml(item.preview || "尚未填写")}</div>
        <div class="profile-actions secret-actions">
          <button class="mini-button" data-secret-fill="${escapeHtml(item.key)}">带入表单</button>
          <button class="mini-button danger" data-secret-clear="${escapeHtml(item.key)}">清空</button>
          ${item.providerKey ? `<button class="mini-button" data-secret-test="${escapeHtml(item.providerKey)}">测试</button>` : ""}
        </div>
      </div>`
    )
    .join("");

  select.innerHTML = data.map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`).join("");

  root.querySelectorAll("[data-secret-fill]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("secret-key").value = button.dataset.secretFill;
      document.getElementById("secret-value").focus();
      focusPanel("secret-form");
      setResult("已把目标密钥带入表单。");
    });
  });

  root.querySelectorAll("[data-secret-clear]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await deleteSecret(button.dataset.secretClear);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });

  root.querySelectorAll("[data-secret-test]").forEach((button) => {
    button.addEventListener("click", () => testProvider(button.dataset.secretTest));
  });
}

function renderChannels(data) {
  state.channels = data;
  document.getElementById("channels-list").innerHTML = data
    .map((item) => {
      if (item.channel === "feishu") {
        return `
          <div class="channel-card" data-channel-card="feishu">
            <div class="panel-head">
              <span class="panel-kicker">飞书</span>
              <div class="chip-row">
                <span class="status-chip ${item.configured ? "ok" : "bad"}">${item.configured ? "已配置" : "未配置"}</span>
                <span class="status-chip ${item.tested ? "ok" : "warn"}">${item.tested ? "已验证" : "未验证"}</span>
              </div>
            </div>
            <div class="channel-summary">${escapeHtml(item.summary)}</div>
            <form class="stack-form channel-form" data-channel="feishu">
              <label><span>App ID</span><input name="appId" type="text" value="${escapeHtml(item.fields.appId || "")}" autocomplete="off" spellcheck="false" /></label>
              <label><span>App Secret</span><input name="appSecret" type="password" value="${escapeHtml(item.fields.appSecret || "")}" autocomplete="new-password" spellcheck="false" /></label>
              <label><span>Domain</span><input name="domain" type="text" value="${escapeHtml(item.fields.domain || "feishu")}" /></label>
              <label><span>Render Mode</span><input name="renderMode" type="text" value="${escapeHtml(item.fields.renderMode || "auto")}" /></label>
              <label><span>监听超时（毫秒）</span><input name="listenerTimeout" type="number" min="1000" max="120000" value="${escapeHtml(String(item.fields.listenerTimeout || 120000))}" /></label>
              <label><span>Worker 运行超时（毫秒）</span><input name="inboundWorkerRunTimeoutMs" type="number" min="0" max="1800000" value="${escapeHtml(String(item.fields.inboundWorkerRunTimeoutMs || 1800000))}" /></label>
              <label class="inline-check"><input name="enabled" type="checkbox" ${item.fields.enabled ? "checked" : ""} /><span>启用飞书通道</span></label>
              <label class="inline-check"><input name="streaming" type="checkbox" ${item.fields.streaming ? "checked" : ""} /><span>启用流式输出</span></label>
              <div class="inline-actions">
                <button class="action-button action-primary" type="submit">保存飞书配置</button>
                <button class="mini-button" type="button" data-test-channel="feishu">测试</button>
                <button class="mini-button danger" type="button" data-delete-channel="feishu">删除</button>
              </div>
            </form>
          </div>`;
      }

      return `
        <div class="channel-card" data-channel-card="telegram">
          <div class="panel-head">
            <span class="panel-kicker">Telegram</span>
            <div class="chip-row">
              <span class="status-chip ${item.configured ? "ok" : "bad"}">${item.configured ? "已配置" : "未配置"}</span>
              <span class="status-chip ${item.tested ? "ok" : "warn"}">${item.tested ? "已验证" : "未验证"}</span>
            </div>
          </div>
          <div class="channel-summary">${escapeHtml(item.summary)}</div>
          <form class="stack-form channel-form" data-channel="telegram">
              <label><span>Bot Token</span><input name="botToken" type="password" value="${escapeHtml(item.fields.botToken || "")}" autocomplete="new-password" spellcheck="false" /></label>
              <label><span>你的 Telegram 用户 ID</span><input name="ownerUserId" type="text" value="${escapeHtml(item.fields.ownerUserId || "")}" placeholder="例如 123456789" autocomplete="off" spellcheck="false" /></label>
              <label><span>allowFrom</span><input name="allowFrom" type="text" value="${escapeHtml(item.fields.allowFrom || "")}" placeholder="多个 ID 用逗号分隔" autocomplete="off" spellcheck="false" /></label>
              <label><span>groupAllowFrom</span><input name="groupAllowFrom" type="text" value="${escapeHtml(item.fields.groupAllowFrom || "")}" placeholder="多个 ID 用逗号分隔" autocomplete="off" spellcheck="false" /></label>
            <label><span>私聊策略</span>
              <select name="dmPolicy">
                <option value="allowlist" ${item.fields.dmPolicy === "allowlist" ? "selected" : ""}>allowlist</option>
                <option value="open" ${item.fields.dmPolicy === "open" ? "selected" : ""}>open</option>
              </select>
            </label>
            <label><span>群组策略</span>
              <select name="groupPolicy">
                <option value="allowlist" ${item.fields.groupPolicy === "allowlist" ? "selected" : ""}>allowlist</option>
                <option value="open" ${item.fields.groupPolicy === "open" ? "selected" : ""}>open</option>
                <option value="disabled" ${item.fields.groupPolicy === "disabled" ? "selected" : ""}>disabled</option>
              </select>
            </label>
            <label class="inline-check"><input name="enabled" type="checkbox" ${item.fields.enabled ? "checked" : ""} /><span>启用 Telegram 通道</span></label>
            <label class="inline-check"><input name="streaming" type="checkbox" ${item.fields.streaming ? "checked" : ""} /><span>启用流式输出</span></label>
            <div class="inline-actions">
              <button class="action-button action-primary" type="submit">保存 Telegram 配置</button>
              <button class="mini-button" type="button" data-test-channel="telegram">测试</button>
              <button class="mini-button danger" type="button" data-delete-channel="telegram">删除</button>
            </div>
          </form>
        </div>`;
    })
    .join("");

  document.querySelectorAll(".channel-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await saveChannel(form.dataset.channel, new FormData(form));
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });

  document.querySelectorAll("[data-delete-channel]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await deleteChannel(button.dataset.deleteChannel);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });
  document.querySelectorAll("[data-test-channel]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await testChannel(button.dataset.testChannel);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });
}

function renderConnectionSettings(data) {
  state.connectionSettings = data;
  document.getElementById("connection-gateway-port").value = data.gatewayPort || "";
  document.getElementById("connection-proxy-override").value = data.proxyOverride || "";
  document.getElementById("connection-timeout-seconds").value = data.timeoutSeconds ?? data.defaultTimeoutSeconds ?? 600;
  document.getElementById("connection-settings-meta").innerHTML = `
    <div class="connection-meta-row"><span>当前代理</span><strong>${escapeHtml(data.currentProxy || "未检测到")}</strong></div>
    <div class="connection-meta-row"><span>代理来源</span><strong>${escapeHtml(data.proxySource || "未检测到")}</strong></div>
    <div class="connection-meta-row"><span>当前 Agent 超时</span><strong>${escapeHtml(data.timeoutSeconds === 0 ? "不限制" : String(data.timeoutSeconds ?? data.defaultTimeoutSeconds ?? 600) + " 秒")}</strong></div>
    <div class="connection-meta-row"><span>控制台端口</span><strong>${escapeHtml(String(data.consolePort || ""))}</strong></div>
  `;
}

function renderLogs(data) {
  if (!data.length) {
    document.getElementById("logs-list").innerHTML = '<div class="empty-state">当前还没有日志记录。</div>';
    return;
  }
  document.getElementById("logs-list").innerHTML = data
    .map(
      (item) => `
      <div class="log-entry">
        <div class="log-head">
          <strong>${escapeHtml(item.message)}</strong>
          <span>${escapeHtml(item.time)}</span>
        </div>
        <div class="status-chip ${item.level === "error" ? "bad" : "ok"}">${escapeHtml(item.level)}</div>
        ${item.details ? `<pre class="console-output">${escapeHtml(JSON.stringify(item.details, null, 2))}</pre>` : ""}
      </div>`
    )
    .join("");
}

async function refreshStatus() {
  const data = await request("/api/status");
  renderStatus(data.data);
}

async function refreshSelfCheck() {
  const data = await request("/api/self-check");
  renderSelfCheck(data.data);
}

async function refreshProfiles() {
  const data = await request("/api/profiles");
  renderProfiles(data.data);
}

async function refreshSecrets() {
  const data = await request("/api/secrets");
  renderSecrets(data.data);
}

async function refreshChannels() {
  const data = await request("/api/channels");
  renderChannels(data.data);
}

async function refreshConnectionSettings() {
  const data = await request("/api/connection-settings");
  renderConnectionSettings(data.data);
}

async function refreshSetupGuide() {
  const data = await request("/api/setup-guide");
  renderSetupGuide(data.data);
}

async function refreshLogs() {
  const data = await request("/api/logs");
  renderLogs(data.data);
}

async function loadViewData(viewName, options = {}) {
  const force = Boolean(options.force);
  if (!force && state.loadedViews[viewName]) return;

  if (viewName === "overview") {
    await Promise.all([refreshStatus(), refreshSelfCheck(), refreshSetupGuide()]);
  } else if (viewName === "config") {
    await refreshProfiles();
  } else if (viewName === "channels") {
    await Promise.all([refreshSecrets(), refreshChannels(), refreshConnectionSettings()]);
  } else if (viewName === "logs") {
    await refreshLogs();
  }

  state.loadedViews[viewName] = true;
}

window.onViewChange = (viewName) => loadViewData(viewName);

async function clearLogs() {
  setBusy(true, "正在清空日志...");
  try {
    const data = await request("/api/logs/clear", { method: "POST", body: "{}" });
    setResult(data.message);
    await refreshLogs();
  } finally {
    setBusy(false);
  }
}

async function deleteSecret(key) {
  const match = state.secrets.find((item) => item.key === key);
  const confirmed = window.confirm(`确定要清空 ${match?.label || key} 吗？`);
  if (!confirmed) return;
  setBusy(true, "正在清空密钥...");
  try {
    const data = await request("/api/secrets/delete", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    setResult(data.message);
    await Promise.all([refreshSecrets(), refreshSelfCheck(), refreshSetupGuide(), refreshLogs()]);
    guideToNextStep({ preferTarget: true });
  } finally {
    setBusy(false);
  }
}

async function saveChannel(channel, formData) {
  const payload = { channel };
  for (const [key, value] of formData.entries()) {
    payload[key] = value;
  }
  payload.enabled = formData.get("enabled") === "on";
  payload.streaming = formData.get("streaming") === "on";
  setBusy(true, `正在保存 ${channel === "feishu" ? "飞书" : "Telegram"} 通道配置...`);
  try {
    const data = await request("/api/channels/save", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setResult(data.message);
    await Promise.all([refreshChannels(), refreshSecrets(), refreshSetupGuide(), refreshLogs(), refreshStatus()]);
    guideToNextStep({ preferTarget: true });
  } finally {
    setBusy(false);
  }
}

async function deleteChannel(channel) {
  const label = channel === "feishu" ? "飞书" : "Telegram";
  const confirmed = window.confirm(`确定要删除 ${label} 通道配置吗？`);
  if (!confirmed) return;
  setBusy(true, `正在删除 ${label} 通道配置...`);
  try {
    const data = await request("/api/channels/delete", {
      method: "POST",
      body: JSON.stringify({ channel }),
    });
    setResult(data.message);
    await Promise.all([refreshChannels(), refreshSetupGuide(), refreshLogs(), refreshStatus()]);
    guideToNextStep({ preferTarget: true });
  } finally {
    setBusy(false);
  }
}

async function saveConnectionSettings() {
  const gatewayPort = document.getElementById("connection-gateway-port").value.trim();
  const proxyOverride = document.getElementById("connection-proxy-override").value.trim();
  const timeoutSeconds = document.getElementById("connection-timeout-seconds").value.trim();
  setBusy(true, "正在保存连接设置...");
  try {
    const data = await request("/api/connection-settings", {
      method: "POST",
      body: JSON.stringify({ gatewayPort, proxyOverride, timeoutSeconds }),
    });
    setResult(data.message);
    await Promise.all([refreshConnectionSettings(), refreshStatus(), refreshSelfCheck(), refreshLogs()]);
  } finally {
    setBusy(false);
  }
}

async function testChannel(channel) {
  const label = channel === "feishu" ? "飞书" : "Telegram";
  setBusy(true, `正在测试 ${label} 通道，请稍等...`);
  try {
    const data = await request("/api/tests/channel", {
      method: "POST",
      body: JSON.stringify({ channel }),
    });
    setResult(`${data.message}\n\n${data.preview || ""}`);
    await Promise.all([refreshChannels(), refreshSetupGuide(), refreshLogs(), refreshStatus()]);
    guideToNextStep({ preferTarget: true });
  } finally {
    setBusy(false);
  }
}

async function executeSetupAction(actionId) {
  const labels = {
    install_python: "正在安装 Python，这一步可能需要几分钟...",
    install_node: "正在安装 Node.js，这一步可能需要几分钟...",
    install_openclaw: "正在安装 OpenClaw，请稍等...",
    create_base_config: "正在创建 OpenClaw 基础配置和工作区骨架...",
    start_gateway: "正在启动 OpenClaw，请稍等...",
    test_primary_provider: "正在测试当前主力 Provider，请稍等...",
    test_feishu_channel: "正在测试飞书通道，请稍等...",
    test_telegram_channel: "正在测试 Telegram 通道，请稍等...",
  };
  setBusy(true, labels[actionId] || "正在执行安装或初始化动作...");
  try {
    const data = await request("/api/setup/action", {
      method: "POST",
      body: JSON.stringify({ actionId }),
    });
    setResult(data.message);
    await Promise.all([refreshSelfCheck(), refreshSetupGuide(), refreshLogs(), refreshStatus()]);
    guideToNextStep({ preferTarget: true });
  } finally {
    setBusy(false);
  }
}

async function callGateway(action) {
  const labels = {
    start: "正在启动 OpenClaw，请稍等...",
    stop: "正在关闭 OpenClaw，请稍等...",
    restart: "正在重启 OpenClaw，请稍等...",
  };
  setBusy(true, labels[action] || "正在处理，请稍等...");
  try {
    const data = await request(`/api/gateway/${action}`, { method: "POST", body: "{}" });
    setResult(data.message);
    await Promise.all([refreshStatus(), refreshLogs(), refreshSetupGuide()]);
    guideToNextStep({ preferTarget: true });
  } finally {
    setBusy(false);
  }
}

async function testProvider(providerKey) {
  setBusy(true, `正在测试 ${providerKey}，请稍等...`);
  try {
    const data = await request("/api/tests/provider", {
      method: "POST",
      body: JSON.stringify({ providerKey }),
    });
    setResult(`${data.message}\n\n${data.preview || ""}`);
  } catch (error) {
    setResult(String(error.message || error));
  }
  await Promise.all([refreshLogs(), refreshSetupGuide(), refreshStatus()]);
  guideToNextStep({ preferTarget: true });
  setBusy(false);
}

async function init() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll("[data-config-tab]").forEach((button) => {
    button.addEventListener("click", () => switchConfigTab(button.dataset.configTab));
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await callGateway(button.dataset.action);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });

  document.querySelectorAll(".provider-button").forEach((button) => {
    button.addEventListener("click", () => testProvider(button.dataset.provider));
  });

  document.getElementById("provider-key").addEventListener("change", syncProviderFormDefaults);
  document.getElementById("provider-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await createProviderProfile();
    } catch (error) {
      setResult(String(error.message || error));
      await refreshLogs();
      setBusy(false);
    }
  });

  document.getElementById("refresh-status").addEventListener("click", () => loadViewData("overview", { force: true }));
  document.getElementById("refresh-self-check").addEventListener("click", () => loadViewData("overview", { force: true }));
  document.getElementById("refresh-setup-guide").addEventListener("click", () => loadViewData("overview", { force: true }));
  document.getElementById("refresh-profiles").addEventListener("click", () => loadViewData("config", { force: true }));
  document.getElementById("refresh-secrets").addEventListener("click", () => loadViewData("channels", { force: true }));
  document.getElementById("refresh-channels").addEventListener("click", () => loadViewData("channels", { force: true }));
  document.getElementById("refresh-connection-settings").addEventListener("click", () => loadViewData("channels", { force: true }));
  document.getElementById("refresh-logs").addEventListener("click", () => loadViewData("logs", { force: true }));

  document.getElementById("secret-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveSecret();
    } catch (error) {
      setResult(String(error.message || error));
      await refreshLogs();
      setBusy(false);
    }
  });

  document.getElementById("clear-secret").addEventListener("click", async () => {
    try {
      await deleteSecret(document.getElementById("secret-key").value);
    } catch (error) {
      setResult(String(error.message || error));
      await refreshLogs();
      setBusy(false);
    }
  });

  document.getElementById("test-secret-provider").addEventListener("click", () => {
    const match = state.secrets.find((item) => item.key === document.getElementById("secret-key").value);
    if (!match?.providerKey) {
      setResult("当前选中的不是可直接测试的 Provider 密钥。");
      return;
    }
    testProvider(match.providerKey);
  });

  document.getElementById("connection-settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveConnectionSettings();
    } catch (error) {
      setResult(String(error.message || error));
      await refreshLogs();
      setBusy(false);
    }
  });

  document.getElementById("connection-reset-auto").addEventListener("click", async () => {
    document.getElementById("connection-proxy-override").value = "";
    try {
      await saveConnectionSettings();
    } catch (error) {
      setResult(String(error.message || error));
      await refreshLogs();
      setBusy(false);
    }
  });

  document.getElementById("model-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileName = document.getElementById("model-file-name").value;
    const modelId = document.getElementById("model-id").value.trim();
    const alias = document.getElementById("model-alias").value.trim();
    const applyNow = document.getElementById("apply-now").checked;

    if (!fileName || !modelId) {
      setResult("请先选择 Profile 并填写模型 ID。");
      return;
    }

    try {
      setBusy(true, "正在保存模型设置...");
      const data = await request("/api/profiles/model", {
        method: "POST",
        body: JSON.stringify({ fileName, modelId, alias, applyNow }),
      });
      setResult(data.message);
      await Promise.all([refreshProfiles(), refreshStatus(), refreshLogs()]);
    } catch (error) {
      setResult(String(error.message || error));
      await refreshLogs();
    } finally {
      setBusy(false);
    }
  });

  switchView("overview");
  await loadViewData("overview", { force: true });
  syncProviderFormDefaults();
  setResult("等待操作", true);

  window.setInterval(() => {
    if (!state.busy && state.currentView === "overview") {
      refreshStatus().catch(() => {});
    }
  }, 15000);
}

function renderStatus(data) {
  state.status = data;
  document.getElementById("status-dot").className = `status-dot ${data.running ? "ok" : "bad"}`;
  document.getElementById("running-text").textContent = data.running ? "OpenClaw 正在运行" : "OpenClaw 当前未运行";
  document.getElementById("summary-running").textContent = data.running ? "运行中" : "未运行";
  document.getElementById("summary-model").textContent = data.primaryModel || "未设置";
  document.getElementById("summary-provider").textContent = data.providers?.configuredProviders?.join(" / ") || "暂无";
  document.getElementById("summary-channel").textContent = data.channels?.configuredChannels?.join(" / ") || "暂无";
  document.getElementById("badge-health").textContent = data.healthOk ? "健康检查已通过" : (data.healthMessage || "健康检查未通过");
  document.getElementById("badge-profile").textContent = data.activeProfile ? `当前 Profile：${data.activeProfile}` : "当前 Profile 未匹配";

  const rows = [
    ["主模型", data.primaryModel || "未设置"],
    ["当前 Profile", data.activeProfile || "未匹配"],
    ["Agent 超时", data.timeoutSeconds === 0 ? "不限制" : `${data.timeoutSeconds || 600} 秒`],
    ["已配置 Provider", data.providers?.configuredProviders?.join(" / ") || "暂无"],
    ["绑定地址", data.bind || "未知"],
    ["端口", String(data.port || "")],
    ["代理", data.proxy || "未检测到"],
    ["PID", data.pids?.length ? data.pids.join(", ") : "无"],
    ["健康检查", data.healthOk ? "通过" : data.healthMessage || "未通过"],
  ];

  document.getElementById("status-metrics").innerHTML = rows
    .map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");
}

function renderSelfCheck(data) {
  const cards = [
    ["openclaw.json", data.configExists],
    ["Profiles 目录", data.profileDirExists],
    ["Python", data.pythonAvailable],
    ["OpenClaw 命令", data.openclawAvailable],
    ["Node.js", data.nodeExists],
    ["npm", data.npmAvailable],
    ["winget", data.wingetAvailable],
    ["gateway.cmd", data.gatewayScriptExists],
    ["OpenClaw dist 入口", data.openclawDistExists],
  ];

  document.getElementById("self-check-grid").innerHTML =
    cards
      .map(
        ([label, ok]) => `
        <div class="check-card">
          <strong>${label}</strong>
          <span class="status-chip ${ok ? "ok" : "bad"}">${ok ? "正常" : "缺失"}</span>
        </div>`
      )
      .join("") +
    `
      <div class="check-card">
        <strong>系统代理</strong>
        <div>${escapeHtml(data.proxy || "未检测到")}</div>
      </div>
      <div class="check-card">
        <strong>可用 Profile</strong>
        <div>${data.profilesCount}</div>
      </div>
      <div class="check-card">
        <strong>已配置 Provider</strong>
        <div>${escapeHtml(data.configuredProviders?.join(" / ") || "暂无")}</div>
      </div>
      <div class="check-card">
        <strong>配置主模型</strong>
        <div>${escapeHtml(data.primaryModel || "未设置")}</div>
      </div>
    `;
}

function renderSetupGuide(data) {
  state.setupGuide = data;
  const root = document.getElementById("setup-guide-list");
  const note = document.getElementById("window-note");
  const summary = data.summary || {};
  const nextAction = summary.nextAction || {};
  const nextActionButton = document.getElementById("setup-next-action");

  document.getElementById("setup-current-step").textContent = summary.currentStepTitle || "当前没有待处理步骤";
  document.getElementById("setup-progress-count").textContent = `${summary.completedCount || 0} / ${summary.totalCount || 0}`;
  document.getElementById("setup-next-note").textContent = summary.nextActionNote || "现在可以继续做 Provider、通道和链路验证。";
  nextActionButton.textContent = summary.nextActionLabel || "当前无需额外动作";
  nextActionButton.disabled = !summary.nextActionId && !summary.nextActionTarget;
  nextActionButton.onclick = async () => {
    if (summary.nextActionId) {
      try {
        await executeSetupAction(summary.nextActionId);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
      return;
    }

    if (summary.nextActionTarget) {
      navigateToGuideTarget(nextAction);
    }
  };

  document.getElementById("wizard-stepper").innerHTML = (data.steps || [])
    .map(
      (step) => `
      <div class="wizard-step ${step.done ? "done" : step.current ? "current" : ""}">
        <span class="wizard-step-index">${step.index || "-"}</span>
        <div class="wizard-step-copy">
          <strong>${escapeHtml(step.title)}</strong>
          <span>${step.done ? "已完成" : step.current ? "当前步骤" : "待继续"}</span>
        </div>
      </div>`
    )
    .join("");

  root.innerHTML = data.items
    .map(
      (item) => `
      <div class="check-card setup-guide-card ${item.status === "ok" ? "is-ready" : "is-pending"}">
        <div class="setup-guide-head">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="status-chip ${item.status === "ok" ? "ok" : "bad"}">${item.status === "ok" ? "已就绪" : "待处理"}</span>
        </div>
        <div class="setup-guide-summary">${escapeHtml(item.summary)}</div>
        ${
          item.actions?.length
            ? `<div class="setup-actions setup-actions-compact">
                ${item.actions
                  .map((action) => {
                    if (action.actionId) {
                      return `<button class="mini-button ${action.kind === "primary" ? "setup-primary" : ""}" data-setup-action="${escapeHtml(action.actionId)}">${escapeHtml(action.label)}</button>`;
                    }
                    if (action.target) {
                      return `<button class="mini-button ${action.kind === "primary" ? "setup-primary" : ""}" data-setup-target="${escapeHtml(action.target)}" data-setup-config-tab="${escapeHtml(action.configTab || "")}" data-setup-provider-key="${escapeHtml(action.providerKey || "")}" data-setup-channel="${escapeHtml(action.channel || "")}" data-setup-note="${escapeHtml(action.note || "")}">${escapeHtml(action.label)}</button>${action.note ? `<div class="setup-note">${escapeHtml(action.note)}</div>` : ""}`;
                    }

                    const extra = action.url ? `地址：${escapeHtml(action.url)}` : action.note ? escapeHtml(action.note) : "";
                    return `<div class="setup-note"><strong>${escapeHtml(action.label)}</strong>${extra ? `<div>${extra}</div>` : ""}</div>`;
                  })
                  .join("")}
              </div>`
            : ""
        }
      </div>`
    )
    .join("");

  root.querySelectorAll("[data-setup-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await executeSetupAction(button.dataset.setupAction);
      } catch (error) {
        setResult(String(error.message || error));
        await refreshLogs();
        setBusy(false);
      }
    });
  });

  root.querySelectorAll("[data-setup-target]").forEach((button) => {
    button.addEventListener("click", () =>
      navigateToGuideTarget({
        target: button.dataset.setupTarget,
        configTab: button.dataset.setupConfigTab,
        providerKey: button.dataset.setupProviderKey,
        channel: button.dataset.setupChannel,
        note: button.dataset.setupNote,
      })
    );
  });

  note.innerHTML = `
    <strong>${escapeHtml(data.windowNote.title)}</strong>
    <div style="margin-top:8px;">${escapeHtml(data.windowNote.summary)}</div>
    <div style="margin-top:10px;">已配置通道：${escapeHtml(data.channels.configuredChannels?.join(" / ") || "暂无")}</div>
  `;
}

function guideToNextStep(options = {}) {
  const summary = state.setupGuide?.summary || null;
  if (!summary) return;

  const nextAction = summary.nextAction || {};
  if (options.preferTarget && summary.nextActionTarget) {
    navigateToGuideTarget(nextAction);
    return;
  }

  if (summary.nextActionTarget) {
    navigateToGuideTarget(nextAction);
  }
}

function getViewForTarget(targetId) {
  const mapping = {
    "profiles-list": "config",
    "provider-wizard-panel": "config",
    "model-form": "config",
    "connection-settings-form": "channels",
    "secret-form": "channels",
    "channels-panel": "channels",
  };
  return mapping[targetId] || "overview";
}

function focusPanel(targetId, options = {}) {
  const target = document.getElementById(targetId);
  if (!target) return;

  switchView(getViewForTarget(targetId));
  if (options.configTab) {
    switchConfigTab(options.configTab);
  }

  let focusTarget = target;
  if (options.channel) {
    focusTarget = document.querySelector(`.channel-card[data-channel-card="${options.channel}"]`) || target;
    focusTarget.querySelector("input, select, textarea")?.focus();
  } else if (targetId === "secret-form") {
    document.getElementById("secret-value")?.focus();
  } else if (targetId === "provider-wizard-panel") {
    document.getElementById("provider-profile-name")?.focus();
  }

  focusTarget.scrollIntoView({ behavior: "smooth", block: "start" });
  flashElement(focusTarget);
}

init().catch((error) => {
  setResult(`初始化失败：${error.message || error}`);
});
