import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ---------- Configuration ----------
const LAST_COMMIT_FILE = path.join(process.cwd(), ".last-commit");
const CHANGELOG_DIR = path.join(process.cwd(), "changelogs");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ---------- Git Helpers ----------
function getLastProcessedCommit(): string {
  if (fs.existsSync(LAST_COMMIT_FILE)) {
    return fs.readFileSync(LAST_COMMIT_FILE, "utf8").trim();
  }
  // If no file exists, return the first commit in the repo
  return execSync("git rev-list --max-parents=0 HEAD", { encoding: "utf8" }).trim();
}

function getNewCommitsSinceLast(): string[] {
  const lastHash = getLastProcessedCommit();
  const currentHash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  if (lastHash === currentHash) {
    console.log("🚫 No new commits since last changelog.");
    return [];
  }

  const raw = execSync(`git log ${lastHash}..HEAD --pretty=format:%s`, { encoding: "utf8" });
  return raw.trim().split("\n").filter(Boolean);
}

function updateLastProcessedCommit() {
  const currentHash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  fs.writeFileSync(LAST_COMMIT_FILE, currentHash);
}

// ---------- Markdown Formatter ----------
function fixMarkdownHeadings(markdown: string): string {
  return markdown.replace(/^\*\*(.+?)\*\*$/gm, "## $1");
}

// ---------- AI Summarization ----------
async function summarizeCommits(commits: string[]): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("❌ Missing OPENROUTER_API_KEY in .env.local");
  }

  const prompt = `
    You're writing a changelog for a developer-facing product like Stripe or Twilio.

    Commit messages:
    ${commits.map((msg) => `- ${msg}`).join("\n")}

    Instructions:
    - Group entries into sections like "New Features", "Improvements", "Fixes", etc.
    - Start each section with a bold title (e.g. **New Features**)
    - Use bullet points to describe each change clearly and concisely
    - Focus on what changed and why it matters to the end-user developer
    - Respond in markdown only
    - Do not return an empty response
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000/",
    },
    body: JSON.stringify({
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    console.error("⚠️ No summary returned from OpenRouter:", JSON.stringify(json, null, 2));
    throw new Error("No summary returned from OpenRouter.");
  }

  return fixMarkdownHeadings(content.trim());
}

// ---------- Changelog Writer ----------
function writeChangelog(content: string) {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA"); // YYYY-MM-DD local time
  const filePath = path.join(CHANGELOG_DIR, `${today}.md`);
  const frontmatter = `---\ntitle: Update for ${today}\ndate: ${today}\n---\n\n`;

  if (!fs.existsSync(CHANGELOG_DIR)) {
    fs.mkdirSync(CHANGELOG_DIR);
  }

  if (fs.existsSync(filePath)) {
    console.log(`⚠️ Changelog for ${today} already exists. Skipping.`);
    return;
  }

  fs.writeFileSync(filePath, frontmatter + content, "utf-8");
  console.log(`✅ Changelog written to ${filePath}`);
}

// ---------- Main Script ----------
(async function run() {
  try {
    const commits = getNewCommitsSinceLast();

    const now = new Date();
    const today = now.toLocaleDateString("en-CA"); // local date
    const filePath = path.join(CHANGELOG_DIR, `${today}.md`);

    if (commits.length === 0) {
      if (!fs.existsSync(filePath)) {
        console.log("🟡 No new commits, but no changelog exists yet — creating one from HEAD.");
        const fallback = execSync("git log -1 --pretty=format:%s", { encoding: "utf8" }).trim();
        commits.push(fallback);
      } else {
        console.log("✅ No new commits and changelog already exists. Skipping generation.");
        return;
      }
    }

    console.log("📋 New commits:\n" + commits.join("\n"));

    const markdown = await summarizeCommits(commits);
    console.log("\n🧠 AI-generated changelog:\n", markdown);

    writeChangelog(markdown);
    updateLastProcessedCommit();
  } catch (err: any) {
    console.error("❌ Error generating changelog:", err.message);
  }
})();
