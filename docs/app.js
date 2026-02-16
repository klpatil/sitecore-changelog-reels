const feedEl = document.getElementById("feed");
const productFilter = document.getElementById("productFilter");
const monthFilter = document.getElementById("monthFilter");
const toast = document.getElementById("toast");

const LAST_VISIT = "lastVisit";
const BOOKMARKS = "bookmarks";

const lastVisit = localStorage.getItem(LAST_VISIT);
localStorage.setItem(LAST_VISIT, Date.now());

let allItems = [];
let bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS) || "[]");


fetch("./changelog.json")
  .then(res => res.json())
  .then(data => {
    allItems = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setupFilters(allItems);
    showNewToast(allItems);
    render(allItems);
  });

function setupFilters(data) {
  // Products
  [...new Set(data.map(i => i.product))].forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    productFilter.appendChild(opt);
  });

  // Months
  const months = [...new Set(data.map(i => i.date.slice(0, 7)))];
  monthFilter.innerHTML = `<option value="all">All Months</option>`;
  months.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    monthFilter.appendChild(opt);
  });

  productFilter.onchange = applyFilters;
  monthFilter.onchange = applyFilters;
}

function applyFilters() {
  let filtered = allItems;

  if (productFilter.value !== "all") {
    filtered = filtered.filter(i => i.product === productFilter.value);
  }

  if (monthFilter.value !== "all") {
    filtered = filtered.filter(i =>
      i.date.startsWith(monthFilter.value)
    );
  }

  render(filtered);
}

function showNewToast(data) {
  if (!lastVisit) return;

  const count = data.filter(
    i => new Date(i.date).getTime() > lastVisit
  ).length;

  if (count > 0) {
    toast.textContent = `🔔 ${count} new updates`;
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 4000);
  }
}

function toggleBookmark(id) {
  bookmarks = bookmarks.includes(id)
    ? bookmarks.filter(b => b !== id)
    : [...bookmarks, id];

  localStorage.setItem(BOOKMARKS, JSON.stringify(bookmarks));
  applyFilters();
}

function render(items) {
  feedEl.innerHTML = "";

  items.forEach(item => {
    const id = item.link;
    const isBookmarked = bookmarks.includes(id);
    const isNew =
      lastVisit && new Date(item.date).getTime() > lastVisit;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="product">
        ${item.product}
        ${isNew ? `<span class="new">NEW</span>` : ""}
      </div>

      <div class="date">${new Date(item.date).toDateString()}</div>

      <div class="title">${item.title}</div>
      <div class="summary">${item.summary}</div>
      <div class="impact">💡 ${item.impact}</div>

      <div class="bookmark" onclick="toggleBookmark('${id}')">
        ${isBookmarked ? "❤️ Bookmarked" : "🤍 Bookmark"}
      </div>

      <a class="open-link" href="${item.link}" target="_blank">
        🔗 Open full changelog
      </a>
    `;

    feedEl.appendChild(card);
  });
}

window.toggleBookmark = toggleBookmark;


fetch("./meta.json")
  .then(res => res.json())
  .then(meta => {
    const el = document.getElementById("lastUpdated");
    const date = new Date(meta.lastUpdated);
    el.textContent = `Last updated: ${date.toLocaleString()}`;
  });
