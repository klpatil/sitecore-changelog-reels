import Parser from "rss-parser";
import fs from "fs";
import OpenAI from "openai";

//const parser = new Parser();

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (Sitecore Changelog Reels)"
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const RSS_URL = "https://developers.sitecore.com/changelog/rss.xml";
const OUTPUT = "docs/changelog.json";
const META = "docs/meta.json";

// Load existing changelog (if any)
/*let existing = [];
if (fs.existsSync(OUTPUT)) {
  existing = JSON.parse(fs.readFileSync(OUTPUT));
}*/


let existing = [];

if (fs.existsSync(OUTPUT)) {
  try {
    const raw = fs.readFileSync(OUTPUT, "utf-8").trim();
    if (raw) {
      existing = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("⚠️ Failed to parse existing changelog.json, recreating it");
    existing = [];
  }
}


// Index existing items by link
const existingMap = Object.fromEntries(
  existing.map(i => [i.link, i])
);

//const feed = await parser.parseURL(RSS_URL);

let feed;

try {
  feed = await parser.parseURL(RSS_URL);
} catch (err) {
  console.error("❌ Failed to fetch RSS:", err.message);
  process.exit(1); // fail fast so notification triggers
}


const results = [];
let aiCalls = 0;

for (const item of feed.items.slice(0, 30)) {
  // Already summarized → reuse
  if (existingMap[item.link]) {
    results.push(existingMap[item.link]);
    continue;
  }

  // New item → AI summary
  aiCalls++;

  const prompt = `
Summarize this Sitecore changelog update in 2 short lines:
1. Summary
2. Why it matters

Title: ${item.title}
Description: ${item.contentSnippet}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  const lines = completion.choices[0].message.content
    .split("\n")
    .filter(Boolean);

  results.push({
    date: item.pubDate,
    product: item.categories?.[0] || "Sitecore",
    title: item.title,
    link: item.link,
    summary: lines[0],
    impact: lines[1]
  });
}

// Sort newest first
results.sort((a, b) => new Date(b.date) - new Date(a.date));

// Save changelog
fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

// Save meta info
fs.writeFileSync(
  META,
  JSON.stringify(
    {
      lastUpdated: new Date().toISOString(),
      aiCalls
    },
    null,
    2
  )
);

console.log(`AI calls this run: ${aiCalls}`);
