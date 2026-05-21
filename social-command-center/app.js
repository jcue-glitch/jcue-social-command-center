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
  plan.substackRadar = [...(activeDailyUpdate.substackRadar || []), ...(plan.substackRadar || [])].slice(0, 8);
  plan.performance = {
    ...plan.performance,
    ...(activeDailyUpdate.performance || {})
  };
  plan.keywordBank = {
    ...plan.keywordBank,
    ...(activeDailyUpdate.keywordBank || {})
  };
}
const stateKey = "jimmycue-social-agent-state";
let selectedItemId = plan.contentPack.find((item) => item.type === "Short-form Video")?.id || plan.contentPack[0].id;
let currentFilter = "All";
let currentRadarFilter = "platform";
let selectedLibraryImageId = "";
let selectedCarouselSlideIndex = 0;
let selectedAtmospherePreset = "coffee";

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

function imageLibrary() {
  return loadState().imageLibrary || [];
}

function selectedLibraryImage() {
  const images = imageLibrary();
  if (selectedAtmospherePreset && !selectedLibraryImageId) return null;
  return images.find((image) => image.id === selectedLibraryImageId) || images[0];
}

const atmospherePresets = [
  { id: "coffee", label: "Coffee", tone: "#5c4033" },
  { id: "kissaten", label: "Cafe", tone: "#2f2119" },
  { id: "apartment", label: "Apartment", tone: "#d9cdbb" },
  { id: "fitness", label: "Fitness", tone: "#202225" },
  { id: "nature", label: "Nature", tone: "#59684c" },
  { id: "night", label: "Night", tone: "#151719" }
];

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
  if (type === "Thought Video") return "var(--persimmon)";
  if (type === "Static / Carousel") return "var(--indigo)";
  if (type === "Story") return "var(--moss)";
  return "var(--persimmon)";
}

function renderContentList() {
  const state = loadState();
  const filtered =
    currentFilter === "All" ? plan.contentPack : plan.contentPack.filter((item) => item.type === currentFilter);
  if (filtered.length && !filtered.some((item) => item.id === selectedItemId)) {
    selectedItemId = filtered[0].id;
  }

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

  renderReadBeforeFilming();
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

function renderSourceReferences(item) {
  const references = item.sourceReferences || item.substackReferences || item.sourceLinks || [];
  const inspiration = item.sourceInspiration || [];
  if (!references.length && !inspiration.length) return "";

  const linkedReferences = references
    .map((reference) => {
      if (typeof reference === "string") return `<li>${escapeHtml(reference)}</li>`;
      const label = reference.title || reference.source || reference.url || "Source";
      const note = reference.note ? ` - ${escapeHtml(reference.note)}` : "";
      return reference.url
        ? `<li><a href="${escapeHtml(reference.url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>${note}</li>`
        : `<li><b>${escapeHtml(label)}</b>${note}</li>`;
    })
    .join("");

  const unlinkedInspiration = inspiration
    .map((source) => `<li>${escapeHtml(typeof source === "string" ? source : source.note || source.title || source.source || "")}</li>`)
    .join("");

  return `
    <div class="preview-section">
      <h3>Reference Links</h3>
      <ul class="preview-list reference-list">
        ${linkedReferences}
        ${unlinkedInspiration}
      </ul>
    </div>
  `;
}

function scriptText(item) {
  if (item.talkingScript) {
    return item.talkingScript;
  }
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
  selectedCarouselSlideIndex = 0;
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
    ${renderSourceReferences(item)}
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
  renderCarouselStudio();
}

function renderImageLibrary() {
  const images = imageLibrary();
  if (!selectedLibraryImageId && images[0] && !selectedAtmospherePreset) selectedLibraryImageId = images[0].id;
  byId("imageLibrary").innerHTML = images.length
    ? images
        .map((image) => `
          <button type="button" class="image-thumb${image.id === selectedLibraryImageId ? " selected" : ""}" data-image-id="${escapeHtml(image.id)}" aria-label="Select saved image">
            <img src="${escapeHtml(image.dataUrl)}" alt="">
          </button>
        `)
        .join("")
    : `<p class="empty-library">No saved images yet. Upload a few strong photos and this tool will turn the selected one into a text card.</p>`;

  document.querySelectorAll("[data-image-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedLibraryImageId = button.dataset.imageId;
      selectedAtmospherePreset = "";
      renderImageLibrary();
      renderAtmospherePresets();
      renderCanvas();
    });
  });
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function cleanCarouselLine(value) {
  return String(value || "")
    .replace(/#\w+/g, "")
    .replace(/^search phrases?:.*$/gim, "")
    .replace(/^keywords?:.*$/gim, "")
    .replace(/\s+/g, " ")
    .trim();
}

function carouselSlides(item) {
  const first = cleanCarouselLine(item.hook || item.overlayText?.[0] || item.onScreenText || item.title);
  const candidates = [
    ...(item.overlayText || []).slice(1),
    ...(item.caption || "")
      .split(/\n+/)
      .map(cleanCarouselLine)
      .filter((line) => line && !line.startsWith("#")),
    ...(item.beatSheet || []).map((beat) => beat.line),
    item.retentionBridge,
    item.purpose
  ]
    .map(cleanCarouselLine)
    .filter(Boolean)
    .filter((line) => line.length > 18 && line.length < 150);

  const unique = [];
  candidates.forEach((line) => {
    if (!unique.some((existing) => existing.toLowerCase() === line.toLowerCase())) unique.push(line);
  });

  return [first, ...unique].slice(0, 5).map((text, index) => ({
    index,
    text: index === 0 ? text.toLowerCase() : sentenceCase(text),
    role: index === 0 ? "hook" : "point"
  }));
}

function renderCarouselStudio() {
  const slides = carouselSlides(selectedItem());
  if (selectedCarouselSlideIndex >= slides.length) selectedCarouselSlideIndex = 0;
  byId("carouselSlideSelector").innerHTML = slides
    .map((slide) => `
      <button type="button" class="slide-chip${slide.index === selectedCarouselSlideIndex ? " active" : ""}" data-slide-index="${slide.index}">
        <span>${slide.index + 1}</span>
        ${escapeHtml(slide.role)}
      </button>
    `)
    .join("");

  document.querySelectorAll("[data-slide-index]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCarouselSlideIndex = Number(button.dataset.slideIndex) || 0;
      renderCarouselStudio();
      renderCanvas();
    });
  });

  renderAtmospherePresets();
}

function renderAtmospherePresets() {
  byId("atmospherePresets").innerHTML = atmospherePresets
    .map((preset) => `
      <button type="button" class="atmosphere-preset${preset.id === selectedAtmospherePreset ? " active" : ""}" data-preset="${escapeHtml(preset.id)}">
        <span style="background:${escapeHtml(preset.tone)}"></span>
        ${escapeHtml(preset.label)}
      </button>
    `)
    .join("");

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAtmospherePreset = button.dataset.preset;
      selectedLibraryImageId = "";
      renderImageLibrary();
      renderAtmospherePresets();
      renderCanvas();
    });
  });
}

function renderTrendRadar() {
  const items = currentRadarFilter === "substack" ? plan.substackRadar || [] : plan.trendRadar;
  byId("trendRadar").innerHTML = items
    .map((item) => `
      <div class="radar-item">
        <strong>${escapeHtml(item.signal)}</strong>
        <p>${escapeHtml(item.application || item.implication || "")}</p>
        ${item.postIdea ? `<p><b>Post angle:</b> ${escapeHtml(item.postIdea)}</p>` : ""}
        ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(currentRadarFilter === "substack" ? `Read ${item.source || "source"}` : item.source || "Source")}</a>` : `<p>${escapeHtml(item.source || "Source list pending")}</p>`}
      </div>
    `)
    .join("");
}

function renderReadBeforeFilming() {
  const strip = byId("readBeforeFilming");
  const showStrip = currentFilter === "Thought Video" || selectedItem()?.type === "Thought Video";
  strip.classList.toggle("hidden", !showStrip);
  if (!showStrip) {
    strip.innerHTML = "";
    return;
  }

  const thoughtReferences = plan.contentPack
    .filter((item) => item.type === "Thought Video")
    .flatMap((item) => item.sourceReferences || [])
    .filter((reference) => reference.url);
  const radarReferences = (plan.substackRadar || [])
    .filter((item) => item.url)
    .map((item) => ({ title: item.source || item.signal, url: item.url, note: item.postIdea || item.application }));
  const references = [...thoughtReferences, ...radarReferences].slice(0, 4);

  strip.innerHTML = references.length
    ? references
        .map((reference) => `
          <a href="${escapeHtml(reference.url)}" target="_blank" rel="noreferrer">
            <span>Read before filming</span>
            <strong>${escapeHtml(reference.title || reference.source || "Source")}</strong>
          </a>
        `)
        .join("")
    : `<div><span>Read before filming</span><strong>Add Substack source links to unlock this strip.</strong></div>`;
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
  renderPerformanceIntel();
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

function renderPerformanceIntel() {
  const summary = plan.performance?.yesterdaySummary || {};
  byId("yesterdayStatus").textContent = summary.status || "Waiting for first 24h snapshot";
  byId("yesterdayNote").textContent = summary.note || "When a new post is synced, yesterday's post performance will appear here.";

  const outliers = plan.performance?.outlierSignals || [];
  byId("outlierStrip").innerHTML = outliers
    .slice(0, 3)
    .map((item) => `
      <div class="outlier-card">
        <span>${escapeHtml(item.platform || "Signal")} · ${escapeHtml(item.metric || "outlier")}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.repeat || item.why || "")}</p>
      </div>
    `)
    .join("");
}

const youtubeSetupSteps = [
  "Run the local YouTube bridge before syncing.",
  "Use Sync YouTube after a new Short has had time to collect data.",
  "Notion stores Content Pieces, Performance Snapshots, and outlier learnings."
];

const tiktokSetupSteps = [
  "Website URL, Terms, Privacy, and verification file are live on Cloudflare.",
  "Keep Login Kit as the only product for now.",
  "Keep scopes limited to user.info.basic and video.list.",
  "Upload a short demo video, then submit the TikTok app for review.",
  "After approval, add the local TikTok OAuth bridge and sync recent videos into Notion."
];

const tiktokReviewCopy = `JCue Social Command Center is a private creator dashboard used only by the owner of @jimmycue.

Login Kit allows the account owner to authorize their own TikTok account. The user.info.basic scope is used to confirm the authorized TikTok profile. The video.list scope is used to retrieve the owner's recent TikTok video metadata, including video IDs, descriptions, share URLs, timestamps, and public performance counts where available.

This data is used only for private content planning, daily performance review, and Notion-based historical tracking. The dashboard compares recent TikTok posts with YouTube Shorts and, later, Instagram Reels to help the creator understand which hooks, themes, and formats are performing.

The app does not publish content, upload videos, automate engagement, scrape TikTok, send messages, or manage third-party accounts.`;

const remoteAccessSteps = [
  "For safest everyday phone access, deploy only the static social-command-center folder.",
  "Do not upload .youtube token files, OAuth credentials, screenshots, or private exports.",
  "If the site contains private plans or real analytics, put it behind a login or access-control layer.",
  "Use the local YouTube bridge only on your Mac or on a private network. A public tunnel needs authentication.",
  "After deployment, open the hosted URL on your phone and add it to the home screen."
];

function renderLiveAnalyticsHub() {
  const state = loadState();
  const youtubeMetric = metricsState()["YouTube Shorts"] || {};
  const starterYoutubeMetric = plan.performance.starterMetrics.find((metric) => metric.platform === "YouTube Shorts") || {};
  const youtubeFollowers = Math.max(
    Number(youtubeMetric.followers) || 0,
    Number(starterYoutubeMetric.followers) || 0,
    985
  );
  const statuses = [
    {
      platform: "YouTube",
      status: state.metrics?.["YouTube Shorts"] ? "Connected" : "Connected locally",
      tone: "connected",
      detail: `${youtubeFollowers} subscribers latest known. Last sync updates the dashboard and Notion-ready cache.`
    },
    {
      platform: "Notion",
      status: "Connected",
      tone: "connected",
      detail: "Metrics hub is live with Content Pieces, Performance Snapshots, and Outliers + Learnings."
    },
    {
      platform: "TikTok",
      status: "Pending review",
      tone: "pending",
      detail: "Website verified. Login Kit + video.list submitted path is waiting on TikTok approval."
    },
    {
      platform: "Instagram",
      status: "Paused",
      tone: "paused",
      detail: "Waiting until Meta / Business access is available so manual logging is not required."
    }
  ];

  byId("platformStatusGrid").innerHTML = statuses
    .map((item) => `
      <div class="platform-status ${escapeHtml(item.tone)}">
        <span>${escapeHtml(item.status)}</span>
        <strong>${escapeHtml(item.platform)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
    `)
    .join("");

  byId("liveAnalyticsChecklist").innerHTML = renderCheckList([...youtubeSetupSteps, ...tiktokSetupSteps.slice(0, 3)], "+");
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
    renderLiveAnalyticsHub();
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

## Substack Radar

${(plan.substackRadar || []).map((item) => `- ${item.signal}: ${item.application}`).join("\n")}

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
  const references = item.sourceReferences || item.substackReferences || item.sourceLinks || [];
  const sourceReferences = references.length
    ? `\n\n## Reference Links\n\n${references
        .map((reference) => {
          if (typeof reference === "string") return `- ${reference}`;
          return `- ${reference.title || reference.source || "Source"}${reference.url ? `: ${reference.url}` : ""}${reference.note ? ` - ${reference.note}` : ""}`;
        })
        .join("\n")}`
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
${sourceReferences}
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
- Occasional business lane: ${plan.businessVenture.name}, a premium atelier for high-achieving people with taste who are tired of consuming inspiration and ready to create something real from within. Use this only when the theme naturally connects to taste, space, ritual, creative action, borrowed inspiration, or self-authored living.

Use the active JCue copy style system:
- Copy should feel like calm authority from someone who built a life intentionally.
- On-screen hooks must be short, strong, and negative or contrarian when possible, using patterns like "most people...", "your ___ is not the problem", "you are not lazy, you are ___", "modern life is destroying ___", "the way you ___ shapes the way you ___", "people underestimate ___", or "___ is not aesthetic. it is ___".
- Captions should follow this rhythm: strong thesis, contrarian clarification, why it matters, tie back to Jimmy's lifestyle, final memorable line, and hashtags.
- Use 1-2 Creator Search Insight topics per video concept and translate the surface topic into a deeper psychological angle.
- Always include #jimmycue and use 4-6 hashtags maximum.
- Avoid poetic aesthetic writing, vague healing language, hustle culture, generic self-help, and overly emotional journaling.

Daily output must include:
- One weekly theme or continuation of the weekly theme.
- One static photo or carousel idea.
- Three short-form video ideas that can be filmed in 30-45 minutes in the apartment or on the morning commute.
- One Substack-informed talking-head thought video with a complete point, built from one or several public references and curated into Jimmy's voice. Use this lane to reach high-achieving people with taste when the daily theme fits.
- One to two story post ideas.
- A biweekly long-form YouTube suggestion when the current week needs one, including title, thesis, chapter outline, filming plan, thumbnail direction, SEO description, and repurpose plan.
- Hook, first-frame direction, 3-5 second retention bridge, shot list, talking script, caption, SEO keywords, hashtags, platform priority, and edit notes for every piece.
- A simple posting schedule in ${plan.meta.timezone}.
- Current trend signals from TikTok, Instagram, YouTube Shorts, Reddit/X/news where accessible, with source links.
- Substack Radar: read public posts/RSS from the approved source list and use them as one additive research lane for deeper language, cultural questions, essay ideas, and viewer psychology. Do not make Substack the sole source; combine it with trending articles, videos, news, blogs, search patterns, and platform-native trend signals.
- Occasional atelier-lane idea when it fits the day, seeded subtly without hard-selling.
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

function wrappedLines(ctx, text, maxWidth, maxLines = 5) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (lines.length < maxLines) lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawGrain(ctx, width, height, opacity = 0.08) {
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let i = 0; i < 3200; i += 1) {
    const value = Math.floor(130 + Math.random() * 90);
    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1.4, 1.4);
  }
  ctx.restore();
}

function drawAtmosphere(ctx, preset, width, height) {
  const mode = atmospherePresets.find((item) => item.id === preset)?.id || "coffee";
  const gradients = {
    coffee: ["#2c211a", "#6d4c36", "#c59a67"],
    kissaten: ["#18110e", "#3a261c", "#987350"],
    apartment: ["#e7ded0", "#c7b8a4", "#f5eee3"],
    fitness: ["#070808", "#1a1d1e", "#4a4032"],
    nature: ["#172116", "#465d38", "#a8b891"],
    night: ["#090b0d", "#141b22", "#485059"]
  };
  const [deep, mid, light] = gradients[mode];
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, deep);
  background.addColorStop(0.58, mid);
  background.addColorStop(1, light);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = mode === "apartment" ? 0.32 : 0.2;
  ctx.fillStyle = "#fff8ec";
  if (mode === "fitness") {
    ctx.fillRect(0, 0, width, 210);
    ctx.fillStyle = "#0f1111";
    for (let y = 770; y < height; y += 78) ctx.fillRect(0, y, width, 3);
    for (let x = 0; x < width; x += 92) ctx.fillRect(x, 760, 3, height - 760);
  } else if (mode === "nature") {
    for (let i = 0; i < 24; i += 1) {
      ctx.beginPath();
      ctx.ellipse(80 + Math.random() * 920, 80 + Math.random() * 520, 35 + Math.random() * 100, 10 + Math.random() * 38, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mode === "apartment") {
    ctx.fillRect(116, 136, 18, 940);
    ctx.fillRect(146, 152, 620, 10);
    ctx.fillRect(760, 120, 180, 960);
    ctx.fillStyle = "rgba(90,74,58,0.26)";
    ctx.beginPath();
    ctx.ellipse(590, 1040, 420, 105, -0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(710, 420, 260, 310, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(120, 1010, 760, 52);
    ctx.fillRect(205, 1090, 545, 42);
  }
  ctx.globalAlpha = 1;

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.44, 100, width * 0.5, height * 0.48, 850);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, mode === "apartment" ? "rgba(70,52,36,0.18)" : "rgba(0,0,0,0.44)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  drawGrain(ctx, width, height, mode === "apartment" ? 0.045 : 0.075);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function coverCrop(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (image.width - cropWidth) / 2;
  const cropY = (image.height - cropHeight) / 2;
  ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
}

async function renderCanvas() {
  const canvas = byId("coverCanvas");
  const ctx = canvas.getContext("2d");
  const item = selectedItem();
  const imageEntry = selectedLibraryImage();
  const slide = carouselSlides(item)[selectedCarouselSlideIndex] || carouselSlides(item)[0];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (imageEntry?.dataUrl) {
    try {
      const image = await loadImage(imageEntry.dataUrl);
      coverCrop(ctx, image, 0, 0, canvas.width, canvas.height);
      const imageWash = ctx.createLinearGradient(0, 0, 0, canvas.height);
      imageWash.addColorStop(0, "rgba(0,0,0,0.20)");
      imageWash.addColorStop(0.5, "rgba(0,0,0,0.04)");
      imageWash.addColorStop(1, "rgba(0,0,0,0.50)");
      ctx.fillStyle = imageWash;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrain(ctx, canvas.width, canvas.height, 0.045);
    } catch {
      selectedLibraryImageId = "";
      drawAtmosphere(ctx, selectedAtmospherePreset, canvas.width, canvas.height);
    }
  } else {
    drawAtmosphere(ctx, selectedAtmospherePreset, canvas.width, canvas.height);
  }

  const hasImage = Boolean(imageEntry?.dataUrl);
  const isHook = slide.role === "hook";
  const darkPreset = ["fitness", "night", "kissaten"].includes(selectedAtmospherePreset) || hasImage;
  const headlineColor = isHook && !hasImage && !["fitness", "night", "kissaten"].includes(selectedAtmospherePreset) ? "#ff8bf2" : "#fffef9";
  const smallColor = darkPreset ? "rgba(255,254,249,0.82)" : "rgba(255,254,249,0.88)";

  ctx.textAlign = "center";
  ctx.fillStyle = smallColor;
  ctx.font = "900 24px Inter, Avenir Next, Arial";
  ctx.letterSpacing = "3px";
  ctx.fillText("JIMMY CUE", canvas.width / 2, 72);
  ctx.letterSpacing = "0px";

  const text = slide.text;
  const maxWidth = isHook ? 900 : 760;
  let fontSize = isHook ? 104 : 46;
  let lineHeight = isHook ? 104 : 60;
  let lines = [];
  do {
    ctx.font = `900 ${fontSize}px Inter, Avenir Next, Arial`;
    lines = wrappedLines(ctx, text, maxWidth, isHook ? 4 : 5);
    if (lines.length <= (isHook ? 3 : 4)) break;
    fontSize -= 8;
    lineHeight -= 7;
  } while (fontSize > (isHook ? 66 : 34));

  const blockHeight = lines.length * lineHeight;
  const startY = isHook ? Math.max(410, 720 - blockHeight / 2) : 555;
  ctx.fillStyle = headlineColor;
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 18;
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });
  ctx.shadowBlur = 0;

  if (!isHook) {
    const eyebrow = item.title || "daily thought";
    ctx.fillStyle = "rgba(255,254,249,0.66)";
    ctx.font = "800 22px Inter, Avenir Next, Arial";
    ctx.fillText(eyebrow.toLowerCase(), canvas.width / 2, 1048);
  }

  ctx.fillStyle = smallColor;
  ctx.font = "700 22px Inter, Avenir Next, Arial";
  ctx.fillText(isHook ? "a thought for today" : `${selectedCarouselSlideIndex + 1}/${carouselSlides(item).length}`, canvas.width / 2, 1238);
}

function handlePhotoUpload(event) {
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  let remaining = files.length;
  const nextImages = [];
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      nextImages.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        dataUrl: String(reader.result || "")
      });
      remaining -= 1;
      if (!remaining) {
        const state = loadState();
        state.imageLibrary = [...(state.imageLibrary || []), ...nextImages].slice(-16);
        selectedLibraryImageId = nextImages[0]?.id || selectedLibraryImageId;
        selectedAtmospherePreset = "";
        saveState(state);
        event.target.value = "";
        renderImageLibrary();
        renderAtmospherePresets();
        renderCanvas();
      }
    };
    reader.readAsDataURL(file);
  });
}

function clearImageLibrary() {
  const state = loadState();
  delete state.imageLibrary;
  selectedLibraryImageId = "";
  selectedAtmospherePreset = "coffee";
  saveState(state);
  renderImageLibrary();
  renderAtmospherePresets();
  renderCanvas();
}

function downloadPng() {
  renderCanvas().then(() => {
    byId("coverCanvas").toBlob((blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedItem().id}-slide-${selectedCarouselSlideIndex + 1}.png`;
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
      renderPreview();
    });
  });

  document.querySelectorAll("[data-radar-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentRadarFilter = button.dataset.radarFilter;
      document.querySelectorAll("[data-radar-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderTrendRadar();
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
  byId("clearImageLibraryButton").addEventListener("click", clearImageLibrary);
  byId("checkYoutubeApiButton").addEventListener("click", checkYoutubeBridge);
  byId("connectYoutubeButton").addEventListener("click", connectYoutube);
  byId("syncYoutubeButton").addEventListener("click", syncYoutubeMetrics);
  byId("copyTikTokReviewButton").addEventListener("click", () => copyText(tiktokReviewCopy, byId("copyTikTokReviewButton"), "Copy Review Copy"));
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
renderImageLibrary();
renderTrendRadar();
renderReadBeforeFilming();
renderKeywords();
renderSchedule();
renderLongForm();
renderMetrics();
renderLiveAnalyticsHub();
renderRemoteAccess();
renderIntegrations();
bindEvents();
checkYoutubeBridge();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
