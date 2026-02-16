// TikTok-style Changelog Reels

const RSS_URL = "./changelog.json"; // fetch pre-generated JSON for GitHub Pages
const feedEl = document.getElementById("feed");
const bookmarkBtn = document.getElementById("bookmarkBtn");
const openLinkBtn = document.getElementById("openLinkBtn");

let changelog = [];
let bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "{}");
let currentVisibleId = null; // Track currently visible card

function getAiIcon() {
    return `<span class="ai-icon">🤖</span>`;
}

// Generate a unique ID from link (since JSON doesn't have id field)
function generateId(item) {
    // Use the last part of the link (the unique slug) as the ID
    if (item.link) {
        const parts = item.link.split('/');
        return parts[parts.length - 1]; // e.g. "introducing-search-experiences-in-sitecoreai"
    }
    return item.title;
}

function updateBookmarkButton() {
    if (currentVisibleId !== null) {
        bookmarkBtn.textContent = bookmarks[currentVisibleId] ? "❤️" : "🤍";
    }
}

function toggleBookmark() {
    if (currentVisibleId === null) return;
    bookmarks[currentVisibleId] = !bookmarks[currentVisibleId];
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    updateBookmarkButton();
}

function openCurrentLink() {
    if (currentVisibleId === null) return;
    const item = changelog.find(c => generateId(c) === currentVisibleId);
    if (item && item.link) {
        window.open(item.link, '_blank');
    }
}

// Attach click handlers to floating buttons
bookmarkBtn.addEventListener('click', toggleBookmark);
openLinkBtn.addEventListener('click', openCurrentLink);

async function fetchChangelog() {
    try {
        const res = await fetch(RSS_URL);
        changelog = await res.json();
        render();
    } catch (err) {
        console.error("Failed to load changelog:", err);
    }
}

function render() {
    feedEl.innerHTML = "";
    
    // IntersectionObserver to track which card is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                currentVisibleId = entry.target.dataset.id;
                updateBookmarkButton();
            }
        });
    }, { threshold: 0.5 });

    for (let item of changelog) {
        const card = document.createElement("div");
        card.className = "card";
        const itemId = generateId(item);
        card.dataset.id = itemId; // Store generated ID for observer
        card.innerHTML = `
    <!-- Default image at top of card -->
      <div class="card-image">
        <img src="https://placehold.co/600x400?text=Smart+Sitecore+Changelog" alt="Changelog image">
      </div>
      <div class="overlay-top">
        <span class="product">${item.product}</span>
        <span class="date">${new Date(item.date).toLocaleDateString()}</span>
      </div>

      <div class="overlay-bottom">
        <div class="title">${item.title}</div>
        <div class="summary">${getAiIcon()}${item.summary}</div>
        <div class="impact">${getAiIcon()}${item.impact}</div>
      </div>
    `;
        feedEl.appendChild(card);
        observer.observe(card); // Observe each card
    }
    
    // Set initial visible card
    if (changelog.length > 0) {
        currentVisibleId = generateId(changelog[0]);
        updateBookmarkButton();
    }
}

fetchChangelog();
