import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Load API key for standalone script

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Get last N commit messages from git log
function getRecentCommits(count = 10): string[] {
  const raw = execSync(`git log -n ${count} --pretty=format:%s`, {
    encoding: "utf-8",
  });
  return raw.trim().split("\n");
}

// Fix markdown formatting: convert **Header** to ## Header
function fixMarkdownHeadings(markdown: string): string {
  return markdown.replace(/^\*\*(.+?)\*\*$/gm, "## $1");
}

// Send commits to OpenRouter to get a changelog summary
async function summarizeCommits(commits: string[]): Promise<string> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY in environment variables");
  }

  const prompt = `
You are writing a changelog for a developer-facing product like Stripe or Twilio.

Given these commit messages, write a clean, user-friendly changelog.

Instructions:
- Group entries into sections like "New Features", "Improvements", "Fixes", etc.
- Start each section with a bold title (e.g. **New Features**)
- Use bullet points to describe each change clearly and concisely
- Focus on what changed and why it matters to the end-user developer
- Respond in markdown only
- Do not return an empty response

Commit messages:
${commits.map((msg) => `- ${msg}`).join("\n")}
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000/", // or your domain in prod
    },
    body: JSON.stringify({
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const json = await response.json();
  const rawContent = json.choices?.[0]?.message?.content;

  if (!rawContent) {
    console.error("⚠️ Unexpected response from OpenRouter:");
    console.dir(json, { depth: null });
    throw new Error("No summary returned from OpenRouter.");
  }

  return fixMarkdownHeadings(rawContent.trim());
}

// Save final markdown to changelogs/YYYY-MM-DD.md
function writeChangelog(content: string) {
  const today = new Date().toISOString().split("T")[0];
  const filePath = path.join(process.cwd(), "changelogs", `${today}.md`);
  const frontmatter = `---\ntitle: Update for ${today}\ndate: ${today}\n---\n\n`;
  fs.writeFileSync(filePath, frontmatter + content, "utf-8");
  console.log(`✅ Changelog written to ${filePath}`);
}

// Main script
(async function run() {
  try {
    const commits = getRecentCommits(10);
    console.log("📋 Recent commits:\n", commits.join("\n"));

    const summary = await summarizeCommits(commits);
    console.log("\n🧠 AI-generated changelog:\n", summary);

    writeChangelog(summary);
  } catch (err: any) {
    console.error("❌ Error generating changelog:", err.message);
  }
})();
