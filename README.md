# Sitecore Changelog Reels

A reels-style, mobile-first changelog viewer for Sitecore updates.

## Features
- Official Sitecore RSS feed
- AI-generated summaries
- Vertical swipe UI (TikTok-style)
- 🔔 New updates toast
- ❤️ Bookmark favorites
- 🔗 Open original changelog
- 100% static (GitHub Pages)

## Setup

### 1. Create Repo
Create a GitHub repo named:
`sitecore-changelog-reels`

### 2. Add Files
Copy this repository structure and files.

### 3. Add Secret
Repo → Settings → Secrets → Actions  
Add:
OPENAI_API_KEY=your_key

### 4. Enable GitHub Pages
Repo → Settings → Pages  
- Source: `main`
- Folder: `/docs`

### 5. Done 🎉
Your app will be live at:
https://<username>.github.io/sitecore-changelog-reels/

To run in local run "live-server"

## Automation Details

- Changelog updates run every 12 hours via GitHub Actions
- AI summaries are generated **only for new items**
- Existing summaries are reused to save cost
- `meta.json` tracks last update time
- Failures trigger GitHub Action alerts
