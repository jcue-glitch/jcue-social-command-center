const plan = window.JIMMY_SOCIAL_PLAN;
const dailyUpdates = window.JCUE_DAILY_UPDATES || [];
const isoDateInTimeZone = (timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const requestedDate = new URLSearchParams(window.location.search).get("date");
const activeDate = requestedDate || isoDateInTimeZone(plan.meta.timezone || "Asia/Tokyo");
const activeDailyUpdate =
  dailyUpdates.find((update) => update.dailyBrief?.date === activeDate || update.generatedAt === activeDate) ||
  [...dailyUpdates]
    .filter((update) => (update.dailyBrief?.date || update.generatedAt || "") <= activeDate)
    .pop() ||
  dailyUpdates[dailyUpdates.length - 1];
if (activeDailyUpdate) {
  plan.meta.generatedAt = activeDailyUpdate.generatedAt || plan.meta.generatedAt;
  plan.strategy.weeklyTheme = activeDailyUpdate.weeklyTheme || plan.strategy.weeklyTheme;
  plan.dailyBrief = activeDailyUpdate.dailyBrief || plan.dailyBrief;
  plan.contentPack = activeDailyUpdate.contentPack || plan.contentPack;
  plan.schedule = activeDailyUpdate.schedule || plan.schedule;
  plan.trendRadar = [...(activeDailyUpdate.trendRadar || []), ...plan.trendRadar].slice(0, 12);
  plan.keywordBank = {
    ...plan.keywordBank,
    ...(activeDailyUpdate.keywordBank || {})
  };
}
const stateKey = "jimmycue-social-agent-state";
let selectedItemId = plan.contentPack.find((item) => item.type === "Short-form Video")?.id || plan.contentPack[0].id;
let currentFilter = "All";
let uploadedImageDataUrl = "";

const byId = (id) => document.getElementById(id);
const selectedItem = () => plan.contentPack.find((item) => item.id === selectedItemId) || plan.contentPack[0];

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(stateKey) || "{}");
  } catch {
    return {};
  }
}

function saveState(nextState) {
  localStorage.setItem(stateKey, JSON.stringify(nextState));
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyText(text, button, defaultLabel) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    if (button) {
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = defaultLabel;
      }, 1400);
    }
  } catch {
    fallbackCopy(text);
  }
}

function renderCheckList(items, dot = "+") {
  return items
    .map((item) => `<div class="check-item"><span class="check-dot">${escapeHtml(dot)}</span><span>${escapeHtml(item)}</span></div>`)
    .join("");
}

function renderShell() {
  byId("dashboardTitle").textContent = `${plan.meta.creator} ${plan.meta.dashboardName}`;
  byId("timezoneLabel").textContent = `Prepared for ${plan.meta.timezone}`;
  byId("firstLiveBrief").textContent = plan.meta.firstLiveBrief;
  byId("briefDate").textContent = `${plan.dailyBrief.day}, ${plan.dailyBrief.date} - ${plan.dailyBrief.deliveryTime}`;
  byId("briefTitle").textContent = plan.dailyBrief.title;
  byId("briefObjective").textContent = plan.dailyBrief.objective;
  byId("brandLine").textContent = plan.meta.brandLine;
  byId("operatingIdea").textContent = plan.meta.operatingIdea;
  byId("weeklyTitle").textContent = plan.strategy.weeklyTheme.title;
  byId("weeklyThesis").textContent = plan.strategy.weeklyTheme.thesis;
  byId("weeklyWhy").textContent = plan.strategy.weeklyTheme.whyNow;
  byId("weeklyRule").textContent = plan.strategy.weeklyTheme.contentRule;
  byId("locationPlan").textContent = plan.dailyBrief.locationPlan;
  byId("doNotList").innerHTML = renderCheckList(plan.dailyBrief.todayDoNotDo, "!");
  byId("approvalChecklist").innerHTML = renderCheckList(plan.dailyBrief.approvalChecklist, "+");
  byId("researchStamp").textContent = `Updated ${plan.meta.generatedAt}`;
}

function typeColor(type) {
  if (type === "Short-form Video") return "var(--lacquer)";
  if (type === "Static / Carousel") return "var(--indigo)";
  if (type === "Story") return "var(--moss)";
  return "var(--persimmon)";
}

function renderContentList() {
  const state = loadState();
  const filtered =
    currentFilter === "All" ? plan.contentPack : plan.contentPack.filter((item) => item.type === currentFilter);

  byId("contentList").innerHTML = filtered
    .map((item) => {
      const selected = item.id === selectedItemId ? " selected" : "";
      const status = state.approvals?.[item.id]?.approval || "Ready";
      return `
        <button type="button" class="content-row${selected}" data-item-id="${escapeHtml(item.id)}">
          <span class="platform-chip" style="border-color:${typeColor(item.type)}">${escapeHtml(item.type.replace("Short-form ", ""))}</span>
          <span class="content-meta">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.format)}</p>
            <p>${escapeHtml(item.purpose)}</p>
          </span>
          <span class="status-pill">${escapeHtml(status)}</span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".content-row").forEach((button) => {
    button.addEventListener("click", () => {
      selectedItemId = button.dataset.itemId;
      renderContentList();
      renderPreview();
    });
  });
}

function renderBeatSheet(item) {
  if (!item.beatSheet) return "";
  return `
    <div class="preview-section">
      <h3>Script Beats</h3>
      <ul class="preview-list">
        ${item.beatSheet
          .map((beat) => `<li><b>${escapeHtml(beat.time)}</b>: ${escapeHtml(beat.action)}<br>${escapeHtml(beat.line)}</li>`)
          .join("")}
      </ul>
    </div>
  `;
}

function renderShotList(item) {
  if (!item.shotList) return "";
  return `
    <div class="preview-section">
      <h3>Shot List</h3>
      <ul class="preview-list">
        ${item.shotList.map((shot) => `<li>${escapeHtml(shot)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderPlatformNotes(item) {
  if (!item.platformNotes) return "";
  return `
    <div class="preview-section">
      <h3>Platform Notes</h3>
      <ul class="preview-list">
        ${Object.entries(item.platformNotes)
          .map(([platform, note]) => `<li><b>${escapeHtml(platform)}</b>: ${escapeHtml(note)}</li>`)
          .join("")}
      </ul>
    </div>
  `;
}

function scriptText(item) {
  if (item.beatSheet) {
    return item.beatSheet.map((beat) => `${beat.time} - ${beat.line}`).join("\n");
  }
  if (item.overlayText) {
    return item.overlayText.join("\n");
  }
  return item.copy || item.caption || "";
}

function renderPreview() {
  const state = loadState();
  const item = selectedItem();
  const saved = state.approvals?.[item.id];
  byId("previewTitle").textContent = item.title;
  byId("previewType").textContent = item.type;
  byId("previewType").style.borderColor = typeColor(item.type);
  byId("revisionNotes").value = saved?.notes || "";
  byId("approvalState").textContent = saved
    ? `Local status: ${saved.approval}. Saved ${saved.updatedAt}.`
    : "No local note recorded.";

  const hook = item.hook ? `<p><b>Hook:</b> ${escapeHtml(item.hook)}</p>` : "";
  const bridge = item.retentionBridge ? `<p><b>3-5 second bridge:</b> ${escapeHtml(item.retentionBridge)}</p>` : "";
  const caption = item.caption ? `<div class="preview-section"><h3>Caption</h3><div class="caption-box">${escapeHtml(item.caption)}</div></div>` : "";
  const hashtags = item.hashtags?.length ? `<p><b>Hashtags:</b> ${escapeHtml(item.hashtags.join(" "))}</p>` : "";
  const keywords = item.keywords?.length ? `<p><b>Keywords:</b> ${escapeHtml(item.keywords.join(", "))}</p>` : "";
  const script = `<div class="preview-section"><h3>Copy / Script</h3><div class="script-box">${escapeHtml(scriptText(item))}</div></div>`;

  byId("contentPreview").innerHTML = `
    <h3>${escapeHtml(item.title)}</h3>
    <p><b>Priority:</b> ${escapeHtml(item.platformPriority.join(" + "))}</p>
    <p><b>Fit:</b> ${escapeHtml(item.filmingFit)}</p>
    ${hook}
    ${bridge}
    ${renderShotList(item)}
    ${renderBeatSheet(item)}
    ${caption}
    ${script}
    <div class="preview-section">
      ${hashtags}
      ${keywords}
      <p><b>Edit note:</b> ${escapeHtml(item.editNotes || "Keep it simple, native, and human.")}</p>
    </div>
    ${renderPlatformNotes(item)}
    <div class="preview-copy-actions">
      <button type="button" class="secondary-button" data-copy-field="caption">Copy Caption</button>
      <button type="button" class="secondary-button" data-copy-field="script">Copy Script</button>
    </div>
  `;

  document.querySelectorAll("[data-copy-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.copyField;
      copyText(field === "caption" ? item.caption || item.copy || "" : scriptText(item), button, field === "caption" ? "Copy Caption" : "Copy Script");
    });
  });

  renderCanvas();
}

function renderTrendRadar() {
  byId("trendRadar").innerHTML = plan.trendRadar
    .map((item) => `
      <div class="radar-item">
        <strong>${escapeHtml(item.signal)}</strong>
        <p>${escapeHtml(item.implication)}</p>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.source)}</a>
      </div>
    `)
    .join("");
}

function renderKeywords() {
  byId("primaryKeywords").innerHTML = [...plan.keywordBank.primary, ...plan.keywordBank.secondary]
    .map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`)
    .join("");

  byId("titleIdeas").innerHTML = plan.keywordBank.titles
    .map((title) => `<div class="title-item"><strong>${escapeHtml(title)}</strong><p>Use as Shorts title, Reel cover text, or TikTok search line.</p></div>`)
    .join("");

  byId("hashtagGroups").innerHTML = Object.entries(plan.keywordBank.hashtags)
    .map(([group, tags]) => `
      <div class="hashtag-group">
        <strong>${escapeHtml(group)}</strong>
        <p>${escapeHtml(tags.join(" "))}</p>
      </div>
    `)
    .join("");
}

function renderSchedule() {
  byId("scheduleList").innerHTML = plan.schedule
    .map((item) => `
      <div class="schedule-item">
        <span class="schedule-time">${escapeHtml(item.time)}</span>
        <span class="schedule-platform">${escapeHtml(item.platform)}</span>
        <div>
          <strong>${escapeHtml(item.action)}</strong>
          <p>${escapeHtml(item.reason)}</p>
        </div>
      </div>
    `)
    .join("");
}

function renderLongForm() {
  const longForm = plan.longForm;
  byId("longformCadence").textContent = longForm.cadence;
  byId("longformName").textContent = longForm.title;
  byId("longformThesis").textContent = longForm.thesis;
  byId("longformDescription").textContent = longForm.description;
  byId("longformPublish").textContent = longForm.nextPublishTarget;
  byId("longformReference").textContent = longForm.referenceDirection;
  byId("longformChapters").innerHTML = longForm.sections
    .map((section) => `
      <div class="chapter-item">
        <span>${escapeHtml(section.time)}</span>
        <strong>${escapeHtml(section.chapter)}</strong>
        <p>${escapeHtml(section.purpose)}</p>
        <p><b>Talking point:</b> ${escapeHtml(section.talkingPoint)}</p>
        <p><b>Shots:</b> ${escapeHtml(section.shots.join(", "))}</p>
      </div>
    `)
    .join("");
  byId("longformFilming").innerHTML = renderCheckList(longForm.filmingPlan, "+");
  byId("longformRepurpose").innerHTML = renderCheckList(longForm.repurposePlan, "+");
}

function metricsState() {
  const state = loadState();
  return state.metrics || plan.performance.starterMetrics.reduce((acc, metric) => {
    acc[metric.platform] = { ...metric };
    return acc;
  }, {});
}

function saveMetric(platform, field, value) {
  const state = loadState();
  state.metrics = state.metrics || metricsState();
  state.metrics[platform] = state.metrics[platform] || {};
  state.metrics[platform][field] = Number(value) || 0;
  saveState(state);
  renderPerformanceAdvice();
}

function renderMetrics() {
  const metrics = metricsState();
  byId("metricsGrid").innerHTML = Object.entries(metrics)
    .map(([platform, metric]) => `
      <div class="metric-card">
        <strong>${escapeHtml(platform)}</strong>
        <p>${escapeHtml(metric.notes || "Enter native platform analytics after posting.")}</p>
        <div class="metric-fields">
          ${["followers", "avgViews", "retention", "saves", "shares"].map((field) => `
            <label>
              ${escapeHtml(field)}
              <input type="number" min="0" inputmode="numeric" data-platform="${escapeHtml(platform)}" data-metric="${field}" value="${escapeHtml(metric[field] ?? 0)}">
            </label>
          `).join("")}
        </div>
      </div>
    `)
    .join("");

  document.querySelectorAll("[data-metric]").forEach((input) => {
    input.addEventListener("input", () => saveMetric(input.dataset.platform, input.dataset.metric, input.value));
  });
  renderPerformanceAdvice();
}

const youtubeSetupSteps = [
  "Create or use a Google Cloud project with YouTube Data API v3 and YouTube Analytics API enabled.",
  "Create an OAuth client and add this redirect URI: http://127.0.0.1:4178/oauth2callback",
  "Save the downloaded client JSON as .youtube/oauth_client.json in the JCue Project folder.",
  "Run the local YouTube bridge, then connect and approve read-only YouTube access in Google."
];

const remoteAccessSteps = [
  "For safest everyday phone access, deploy only the static social-command-center folder.",
  "Do not upload .youtube token files, OAuth credentials, screenshots, or private exports.",
  "If the site contains private plans or real analytics, put it behind a login or access-control layer.",
  "Use the local YouTube bridge only on your Mac or on a private network. A public tunnel needs authentication.",
  "After deployment, open the hosted URL on your phone and add it to the home screen."
];

function renderYoutubeSetup() {
  byId("youtubeSetupList").innerHTML = renderCheckList(youtubeSetupSteps, "+");
}

function renderRemoteAccess() {
  byId("remoteAccessChecklist").innerHTML = renderCheckList(remoteAccessSteps, "+");
}

function setYoutubeStatus(label, detail) {
  byId("youtubeConnectionState").textContent = label;
  if (detail) byId("youtubeApiSummary").textContent = detail;
}

function youtubeMetricHtml(data) {
  if (!data?.channel) {
    return "<strong>No YouTube data loaded yet.</strong><p>Connect the local bridge, then sync metrics.</p>";
  }
  const channel = data.channel;
  const analytics = data.analytics || {};
  const recent = data.recentVideos || [];
  return `
    <strong>${escapeHtml(channel.title || "Connected channel")}</strong>
    <p>Subscribers: ${escapeHtml(channel.subscriberCount ?? "n/a")} · Total views: ${escapeHtml(channel.viewCount ?? "n/a")} · Public videos: ${escapeHtml(channel.videoCount ?? "n/a")}</p>
    <p>Last ${escapeHtml(analytics.days || 28)} days: ${escapeHtml(analytics.views ?? 0)} views, ${escapeHtml(analytics.averageViewPercentage ?? 0)}% average viewed, ${escapeHtml(analytics.shares ?? 0)} shares.</p>
    <p><b>Latest videos:</b> ${escapeHtml(recent.slice(0, 3).map((video) => video.title).join(" / ") || "No recent videos returned.")}</p>
  `;
}

async function checkYoutubeBridge() {
  try {
    const response = await fetch("/api/youtube/status", { cache: "no-store" });
    if (!response.ok) throw new Error("Bridge unavailable");
    const data = await response.json();
    setYoutubeStatus(data.authorized ? "Connected" : "Bridge ready", data.message || "Local YouTube bridge is responding.");
    byId("youtubeMetricsPreview").innerHTML = youtubeMetricHtml(data.latest);
  } catch {
    setYoutubeStatus("Bridge offline", "The dashboard is loaded, but the local YouTube API bridge is not running yet.");
  }
}

async function connectYoutube() {
  try {
    const response = await fetch("/api/youtube/auth-url", { cache: "no-store" });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "OAuth client not configured");
    }
    const data = await response.json();
    window.location.href = data.authUrl;
  } catch (error) {
    setYoutubeStatus("Needs setup", error.message || "Add .youtube/oauth_client.json and run the local bridge first.");
  }
}

async function syncYoutubeMetrics() {
  try {
    setYoutubeStatus("Syncing", "Requesting YouTube channel and analytics data from the local bridge.");
    const response = await fetch("/api/youtube/metrics?days=28", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "YouTube sync failed");
    byId("youtubeMetricsPreview").innerHTML = youtubeMetricHtml(data);
    setYoutubeStatus("Synced", `Updated from ${data.channel?.title || "YouTube"} for the last ${data.analytics?.days || 28} days.`);

    const state = loadState();
    state.metrics = state.metrics || metricsState();
    state.metrics["YouTube Shorts"] = {
      ...(state.metrics["YouTube Shorts"] || {}),
      ...data.dashboardMetric,
      notes: "Synced from YouTube API. Likes are mapped into the generic engagement field until the dashboard gets platform-specific labels."
    };
    saveState(state);
    renderMetrics();
  } catch (error) {
    setYoutubeStatus("Sync failed", error.message || "Could not sync YouTube metrics.");
  }
}

function renderPerformanceAdvice() {
  const metrics = Object.entries(metricsState());
  const scored = metrics
    .map(([platform, metric]) => ({
      platform,
      score: (Number(metric.avgViews) || 0) * (1 + (Number(metric.retention) || 0) / 100) + (Number(metric.shares) || 0) * 50 + (Number(metric.saves) || 0) * 30
    }))
    .sort((a, b) => b.score - a.score);

  if (!scored[0] || scored[0].score === 0) {
    byId("performanceAdvice").textContent =
      "Start by entering native views, retention, saves, and shares after the first three posts. Until then, prioritize hooks and searchable captions over volume.";
    return;
  }

  byId("performanceAdvice").textContent =
    `${scored[0].platform} is currently your strongest signal. Tomorrow, make one variation of the same format and change only the hook so we learn what improved retention.`;
}

function renderIntegrations() {
  byId("integrationNeeds").innerHTML = renderCheckList(plan.integrations.requiredForLiveMetrics, "+");
  byId("apiNotes").innerHTML = plan.integrations.apiNotes
    .map((note) => `
      <div class="api-note">
        <strong>${escapeHtml(note.platform)}</strong>
        <p>${escapeHtml(note.note)}</p>
        <a href="${escapeHtml(note.source)}" target="_blank" rel="noreferrer">Source</a>
      </div>
    `)
    .join("");
}

function setApproval(approval) {
  const state = loadState();
  state.approvals = state.approvals || {};
  state.approvals[selectedItemId] = {
    approval,
    notes: byId("revisionNotes").value.trim(),
    updatedAt: new Date().toLocaleString("en-US", { timeZone: plan.meta.timezone })
  };
  saveState(state);
  renderPreview();
  renderContentList();
}

function dailyBriefMarkdown() {
  return `# ${plan.meta.creator} Daily Social Brief - ${plan.dailyBrief.date}

Delivery target: ${plan.dailyBrief.deliveryTime}
Weekly theme: ${plan.strategy.weeklyTheme.title}
Brand line: ${plan.meta.brandLine}

## Objective

${plan.dailyBrief.objective}

## Recommendation

${plan.dailyBrief.recommendation}

## Production Window

${plan.dailyBrief.productionWindow}
${plan.dailyBrief.locationPlan}

## Today's Content

${plan.contentPack.map((item) => `- ${item.type}: ${item.title} (${item.platformPriority.join(" + ")})`).join("\n")}

## Trend Signals

${plan.trendRadar.map((item) => `- ${item.signal} ${item.implication}`).join("\n")}

## Approval Checklist

${plan.dailyBrief.approvalChecklist.map((item) => `- ${item}`).join("\n")}
`;
}

function itemMarkdown(item) {
  const beats = item.beatSheet
    ? `\n\n## Script Beats\n\n${item.beatSheet.map((beat) => `- ${beat.time}: ${beat.line}`).join("\n")}`
    : "";
  const shots = item.shotList
    ? `\n\n## Shot List\n\n${item.shotList.map((shot) => `- ${shot}`).join("\n")}`
    : "";
  const platformNotes = item.platformNotes
    ? `\n\n## Platform Notes\n\n${Object.entries(item.platformNotes).map(([platform, note]) => `- ${platform}: ${note}`).join("\n")}`
    : "";
  return `# ${item.title}

Type: ${item.type}
Format: ${item.format}
Priority: ${item.platformPriority.join(" + ")}
Purpose: ${item.purpose}
Filming fit: ${item.filmingFit}

## Hook

${item.hook || item.overlayText?.[0] || item.copy || ""}

## 3-5 Second Bridge

${item.retentionBridge}
${shots}${beats}

## Caption

${item.caption || item.copy || ""}

## Keywords

${item.keywords?.join(", ") || ""}

## Hashtags

${item.hashtags?.join(" ") || ""}
${platformNotes}
`;
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function buildExportFiles() {
  const metrics = metricsState();
  const scheduleCsv = [
    ["time", "platform", "action", "reason"],
    ...plan.schedule.map((item) => [item.time, item.platform, item.action, item.reason])
  ].map((row) => row.map(csvEscape).join(",")).join("\n");

  const keywordCsv = [
    ["type", "value"],
    ...plan.keywordBank.primary.map((value) => ["primary", value]),
    ...plan.keywordBank.secondary.map((value) => ["secondary", value]),
    ...Object.entries(plan.keywordBank.hashtags).flatMap(([group, tags]) => tags.map((tag) => [`hashtag:${group}`, tag]))
  ].map((row) => row.map(csvEscape).join(",")).join("\n");

  return [
    { name: "daily-brief.md", content: dailyBriefMarkdown() },
    { name: "schedule.csv", content: scheduleCsv },
    { name: "keyword-bank.csv", content: keywordCsv },
    { name: "biweekly-youtube-longform.md", content: longFormMarkdown() },
    { name: "manual-metrics.json", content: JSON.stringify(metrics, null, 2) },
    { name: "platform-integrations.md", content: integrationMarkdown() },
    { name: "daily-agent-prompt.md", content: automationPrompt() },
    ...plan.contentPack.map((item) => ({ name: `${item.id}.md`, content: itemMarkdown(item) }))
  ];
}

function longFormMarkdown() {
  const longForm = plan.longForm;
  return `# Biweekly YouTube Long-form Suggestion

Cadence: ${longForm.cadence}
Publish target: ${longForm.nextPublishTarget}
Title: ${longForm.title}
Format: ${longForm.format}

## Visual Direction

${longForm.referenceDirection}

## Thesis

${longForm.thesis}

## Chapters

${longForm.sections.map((section) => `### ${section.time} - ${section.chapter}
Purpose: ${section.purpose}
Talking point: ${section.talkingPoint}
Shots: ${section.shots.join(", ")}`).join("\n\n")}

## Filming Plan

${longForm.filmingPlan.map((item) => `- ${item}`).join("\n")}

## SEO

Keywords: ${longForm.seoKeywords.join(", ")}

Description: ${longForm.description}

## Repurpose Plan

${longForm.repurposePlan.map((item) => `- ${item}`).join("\n")}
`;
}

function integrationMarkdown() {
  return `# Platform Integration Notes

## Current state

The dashboard works locally with manual metrics. Direct platform publishing and analytics are not enabled until credentials and permissions are connected.

## Needed

${plan.integrations.requiredForLiveMetrics.map((item) => `- ${item}`).join("\n")}

## Sources

${plan.integrations.apiNotes.map((note) => `- ${note.platform}: ${note.source} - ${note.note}`).join("\n")}
`;
}

function automationPrompt() {
  return `Act as Jimmy Cue's personalized AI social media coordinator and planner.

Each day, produce a 7am brief for TikTok, Instagram Reels, YouTube Shorts, and Instagram Stories/photo posts.

Use this creator positioning:
- Creator: Jimmy Cue
- Brand line: ${plan.meta.brandLine}
- Persona: ${plan.meta.operatingIdea}
- Current focus: lifestyle, daily thoughts, apartment/commute filming, fashion OOTD, GRWM, skincare/beauty routine.
- Aesthetic: wabi-sabi, 80s Japan vintage, calm, imperfect beauty.
- Future business bridge: ${plan.meta.futureBridge}

Daily output must include:
- One weekly theme or continuation of the weekly theme.
- One static photo or carousel idea.
- Three short-form video ideas that can be filmed in 30-45 minutes in the apartment or on the morning commute.
- One to two story post ideas.
- A biweekly long-form YouTube suggestion when the current week needs one, including title, thesis, chapter outline, filming plan, thumbnail direction, SEO description, and repurpose plan.
- Hook, first-frame direction, 3-5 second retention bridge, shot list, talking script, caption, SEO keywords, hashtags, platform priority, and edit notes for every piece.
- A simple posting schedule in ${plan.meta.timezone}.
- Current trend signals from TikTok, Instagram, YouTube Shorts, Reddit/X/news where accessible, with source links.
- Performance-informed recommendation if metric history exists; otherwise ask for manual metrics to be entered.

Do not recommend ideas that require a crew, studio, long travel, or more than 45 minutes of morning filming. Keep the tone light, warm, stylish, and human.`;
}

const crcTable = (() => {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

const uint16 = (value) => [value & 0xff, (value >>> 8) & 0xff];
const uint32 = (value) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
const dosTime = (date) => ((date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)) & 0xffff;
const dosDate = (date) => (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;

function makeZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);
    const localHeader = new Uint8Array([
      ...uint32(0x04034b50), ...uint16(20), ...uint16(0), ...uint16(0), ...uint16(dosTime(now)), ...uint16(dosDate(now)),
      ...uint32(checksum), ...uint32(dataBytes.length), ...uint32(dataBytes.length), ...uint16(nameBytes.length), ...uint16(0), ...nameBytes
    ]);
    chunks.push(localHeader, dataBytes);
    central.push({ nameBytes, checksum, size: dataBytes.length, offset });
    offset += localHeader.length + dataBytes.length;
  });

  const centralStart = offset;
  central.forEach((entry) => {
    const header = new Uint8Array([
      ...uint32(0x02014b50), ...uint16(20), ...uint16(20), ...uint16(0), ...uint16(0), ...uint16(dosTime(now)), ...uint16(dosDate(now)),
      ...uint32(entry.checksum), ...uint32(entry.size), ...uint32(entry.size), ...uint16(entry.nameBytes.length), ...uint16(0), ...uint16(0),
      ...uint16(0), ...uint16(0), ...uint32(0), ...uint32(entry.offset), ...entry.nameBytes
    ]);
    chunks.push(header);
    offset += header.length;
  });

  const centralSize = offset - centralStart;
  chunks.push(new Uint8Array([
    ...uint32(0x06054b50), ...uint16(0), ...uint16(0), ...uint16(files.length), ...uint16(files.length),
    ...uint32(centralSize), ...uint32(centralStart), ...uint16(0)
  ]));

  return new Blob(chunks, { type: "application/zip" });
}

function downloadZip() {
  const blob = makeZip(buildExportFiles());
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `jimmycue-social-pack-${plan.dailyBrief.date}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 5) {
  const words = String(text).split(/\s+/);
  let line = "";
  let lines = 0;
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (lines < maxLines) {
        ctx.fillText(line, x, y);
        y += lineHeight;
      }
      line = word;
      lines += 1;
    } else {
      line = testLine;
    }
  });
  if (line && lines < maxLines) ctx.fillText(line, x, y);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function renderCanvas() {
  const canvas = byId("coverCanvas");
  const ctx = canvas.getContext("2d");
  const item = selectedItem();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#efe7da";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#151515";
  ctx.fillRect(72, 72, canvas.width - 144, canvas.height - 144);

  if (uploadedImageDataUrl) {
    try {
      const image = await loadImage(uploadedImageDataUrl);
      const scale = Math.max((canvas.width - 144) / image.width, (canvas.height - 144) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, 72 + (canvas.width - 144 - width) / 2, 72 + (canvas.height - 144 - height) / 2, width, height);
      ctx.fillStyle = "rgba(21, 21, 21, 0.42)";
      ctx.fillRect(72, 72, canvas.width - 144, canvas.height - 144);
    } catch {
      uploadedImageDataUrl = "";
    }
  } else {
    ctx.fillStyle = "#f7f2e7";
    ctx.fillRect(96, 96, canvas.width - 192, canvas.height - 192);
    ctx.fillStyle = "#b22020";
    ctx.fillRect(96, 96, 22, canvas.height - 192);
    ctx.fillStyle = "#1d4d72";
    ctx.beginPath();
    ctx.arc(810, 250, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#566b3f";
    ctx.fillRect(660, 840, 230, 320);
    ctx.strokeStyle = "rgba(23, 23, 23, 0.18)";
    ctx.lineWidth = 3;
    for (let x = 155; x < 900; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 170);
      ctx.lineTo(x - 80, 1130);
      ctx.stroke();
    }
  }

  ctx.fillStyle = uploadedImageDataUrl ? "#fffef9" : "#171717";
  ctx.font = "900 42px Inter, Avenir Next, Arial";
  ctx.fillText("Jimmy Cue", 150, 180);
  ctx.font = "700 24px Inter, Avenir Next, Arial";
  ctx.fillText(plan.meta.brandLine, 150, 220);

  const hook = item.hook || item.overlayText?.[0] || item.title;
  ctx.font = "900 74px Inter, Avenir Next, Arial";
  ctx.fillStyle = uploadedImageDataUrl ? "#fffef9" : "#171717";
  wrapText(ctx, hook, 150, 740, 770, 82, 5);

  ctx.font = "800 26px Inter, Avenir Next, Arial";
  ctx.fillStyle = uploadedImageDataUrl ? "#f6e8d2" : "#6f706a";
  wrapText(ctx, item.retentionBridge || item.purpose, 150, 1110, 760, 34, 3);

  ctx.fillStyle = uploadedImageDataUrl ? "#fffef9" : "#b22020";
  ctx.fillRect(150, 1190, 220, 8);
}

function handlePhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    uploadedImageDataUrl = "";
    renderCanvas();
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedImageDataUrl = String(reader.result || "");
    renderCanvas();
  };
  reader.readAsDataURL(file);
}

function downloadPng() {
  renderCanvas().then(() => {
    byId("coverCanvas").toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedItem().id}-cover.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, "image/png");
  });
}

function bindEvents() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
      renderContentList();
    });
  });

  document.querySelectorAll("[data-approval]").forEach((button) => {
    button.addEventListener("click", () => setApproval(button.dataset.approval));
  });

  byId("copyBriefButton").addEventListener("click", () => copyText(dailyBriefMarkdown(), byId("copyBriefButton"), "Copy Brief"));
  byId("copyCaptionButton").addEventListener("click", () => copyText(selectedItem().caption || selectedItem().copy || "", byId("copyCaptionButton"), "Copy Caption"));
  byId("downloadZipButton").addEventListener("click", downloadZip);
  byId("downloadPngButton").addEventListener("click", downloadPng);
  byId("refreshPngButton").addEventListener("click", renderCanvas);
  byId("checkYoutubeApiButton").addEventListener("click", checkYoutubeBridge);
  byId("connectYoutubeButton").addEventListener("click", connectYoutube);
  byId("syncYoutubeButton").addEventListener("click", syncYoutubeMetrics);
  byId("photoUpload").addEventListener("change", handlePhotoUpload);
  byId("resetMetricsButton").addEventListener("click", () => {
    const state = loadState();
    delete state.metrics;
    saveState(state);
    renderMetrics();
  });
}

renderShell();
renderContentList();
renderPreview();
renderTrendRadar();
renderKeywords();
renderSchedule();
renderLongForm();
renderMetrics();
renderYoutubeSetup();
renderRemoteAccess();
renderIntegrations();
bindEvents();
checkYoutubeBridge();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
