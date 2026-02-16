import Parser from "rss-parser";
import fs from "fs";
import OpenAI from "openai";

const parser = new Parser();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const feed = await parser.parseURL(
  "https://developers.sitecore.com/changelog/rss"
);

const items = [];

for (const item of feed.items.slice(0, 25)) {
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

  items.push({
    date: item.pubDate,
    product: item.categories?.[0] || "Sitecore",
    title: item.title,
    link: item.link,
    summary: lines[0],
    impact: lines[1]
  });
}

fs.writeFileSync(
  "docs/changelog.json",
  JSON.stringify(items, null, 2)
);
