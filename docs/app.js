// TikTok-style Changelog Reels

const RSS_URL = "./changelog.json"; // fetch pre-generated JSON for GitHub Pages
const feedEl = document.getElementById("feed");
const metaEl = document.getElementById("lastUpdated");
const toastEl = document.getElementById("toast");

let changelog = [];
let bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "{}");

function getAiIcon() {
  return `<span class="ai-icon">🤖</span>`;
}

function toggleBookmark(id) {
  bookmarks[id] = !bookmarks[id];
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  render();
}

async function fetchChangelog() {
  try {
    const res = await fetch(RSS_URL);
    changelog = await res.json();
    render();
    metaEl.textContent = "Last updated: " + new Date().toLocaleString();
  } catch (err) {
    metaEl.textContent = "❌ Failed to load changelog";
    console.error(err);
  }
}

function render() {
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
        <div class="summary">${getAiIcon()}${item.summary}</div>
        <div class="impact">${getAiIcon()}${item.impact}</div>
      </div>

      <div class="buttons">
        <div class="bookmark" onclick="toggleBookmark('${item.id}')">${bookmarks[item.id] ? "❤️" : "🤍"}</div>
        <div class="open-link" onclick="window.open('${item.link}','_blank')">🔗</div>
      </div>
    `;
    feedEl.appendChild(card);
  }
}

fetchChangelog();
