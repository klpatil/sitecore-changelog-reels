import Parser from "rss-parser";

const RSS_URL = "https://developers.sitecore.com/changelog.rss";
const OUTPUT = "docs/changelog.json";
const metaEl = document.getElementById("lastUpdated");
const feedEl = document.getElementById("feed");
const toastEl = document.getElementById("toast");

const monthFilter = document.getElementById("monthFilter");
const productFilter = document.getElementById("productFilter");
const summaryToggle = document.getElementById("summaryToggle");

const SUMMARY_ENABLED = "summaryEnabled";
summaryToggle.checked = JSON.parse(localStorage.getItem(SUMMARY_ENABLED) ?? "true");
summaryToggle.addEventListener("change", () => {
  localStorage.setItem(SUMMARY_ENABLED, summaryToggle.checked);
  render();
});

// Simulated storage
let changelog = [];
let bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "{}");

async function fetchRSS() {
  const parser = new Parser({ headers: { "User-Agent": "Sitecore Changelog Reels" } });
  try {
    const feed = await parser.parseURL(RSS_URL);
    changelog = feed.items.map(item => ({
      id: item.guid || item.link,
      product: item.categories?.[0] || "General",
      date: item.pubDate,
      title: item.title,
      summary: item.contentSnippet || "",
      impact: "AI generated impact"
    }));
    render();
    metaEl.textContent = "Last updated: " + new Date().toLocaleString();
  } catch (err) {
    metaEl.textContent = "❌ Failed to fetch RSS";
    console.error(err);
  }
}

function getAiIcon() {
  return `<svg class="ai-icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="30" fill="#0277BD"/>
  <path d="M20 42 L44 42 L32 22 Z" fill="#fff"/>
  <path d="M24 30 L40 30 L32 38 Z" fill="#4DD0E1"/>
  <path d="M28 34 L36 34 L32 30 Z" fill="#81D4FA"/>
  </svg>`;
}

function toggleBookmark(id) {
  bookmarks[id] = !bookmarks[id];
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  render();
}

function render() {
  const showSummary = summaryToggle.checked;
  feedEl.innerHTML = "";
  for (let item of changelog) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="overlay-top">
        <span class="product">${item.product}</span>
        <span class="date">${new Date(item.date).toLocaleDateString()}</span>
      </div>

      <div class="overlay-bottom">
        <div class="title">${item.title}</div>
        ${showSummary ? `<div class="summary">${getAiIcon()}${item.summary}</div>` : ""}
        ${showSummary ? `<div class="impact">${getAiIcon()}${item.impact}</div>` : ""}
      </div>

      <div class="buttons">
        <div class="bookmark" onclick="toggleBookmark('${item.id}')">${bookmarks[item.id] ? "❤️" : "🤍"}</div>
        <div class="open-link" onclick="window.open('${item.link}','_blank')">🔗</div>
      </div>
    `;
    feedEl.appendChild(card);
  }
}

fetchRSS();
