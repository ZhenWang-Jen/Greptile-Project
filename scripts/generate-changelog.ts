import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CHANGELOG_DIR = path.join(process.cwd(), "changelogs");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

function getAllCommitsGroupedByDate(): Record<string, string[]> {
  let raw: string;
  try {
    raw = execSync(
      `git log --pretty=format:"%cd|%s" --date=short`,
      { encoding: "utf8" }
    );
  } catch (err: any) {
    if (err.message.includes('not a git repository')) {
      throw new Error("This directory is not a git repository. Please run this script inside a git project.");
    }
    throw new Error("Failed to run 'git log'. Make sure git is installed and this is a git repository.");
  }

  const lines = raw.trim().split("\n").filter(Boolean);
  if (lines.length === 0) {
    throw new Error("No commits found in this repository. Make some commits before generating a changelog.");
  }
  const grouped: Record<string, string[]> = {};

  for (const line of lines) {
    const [date, message] = line.split("|");
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(message.trim());
  }

  return grouped;
}

function fixMarkdown(md: string): string {
  return md.replace(/^\*\*(.+?)\*\*$/gm, "").trim();
}

async function summarizeCommits(commits: string[], date: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing. Please add it to your .env.local file.");
  }
  const prompt = `
    You are a technical writer generating a public-facing changelog entry for an AI-powered developer tool.

    **Product context:**
    The product is an AI-powered changelog generator. It analyzes git commits, generates polished release notes, and renders them to a frontend like Stripe or Twilio's changelog. The end user is a developer building or using developer tools. Updates may include improvements to parsing, prompt design, tag classification, UI rendering, markdown formatting, and more.

    **Today's commits:**
    ${commits.map((msg) => `- ${msg}`).join("\n")}

    **Instructions:**
    - Write a clean, developer-friendly changelog for this date
    - Include a short title and meaningful tags (e.g. AI, Design, Performance)
    - If no meaningful tags, omit the Tags line
    - Use this markdown format:

    ## ${date}

    ### Title here
    **Tags:** AI, Design

    [One-paragraph summary describing the user-facing value of this change]

    Do not list raw commit messages. Do not include filler tags like chore/test/refactor.
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

  if (!response.ok) {
    throw new Error(`Failed to fetch from OpenRouter API: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No changelog generated for ${date}`);
  return fixMarkdown(content);
}

function writeChangelog(content: string, date: string) {
  const filePath = path.join(CHANGELOG_DIR, `${date}.md`);
  const frontmatter = `---\ntitle: Update for ${date}\ndate: ${date}\n---\n\n`;

  if (!fs.existsSync(CHANGELOG_DIR)) fs.mkdirSync(CHANGELOG_DIR);

  fs.writeFileSync(filePath, frontmatter + content, "utf8");
  console.log(`✅ Wrote changelog for ${date}`);
}

(async function run() {
  try {
    const grouped = getAllCommitsGroupedByDate();
    let wroteAny = false;
    for (const date of Object.keys(grouped)) {
      const filePath = path.join(CHANGELOG_DIR, `${date}.md`);
      if (fs.existsSync(filePath)) {
        console.log(`⏩ Skipping ${date}, changelog already exists.`);
        continue;
      }
      try {
        const summary = await summarizeCommits(grouped[date], date);
        writeChangelog(summary, date);
        wroteAny = true;
      } catch (err: any) {
        console.error(`❌ Error generating changelog for ${date}:`, err.message);
      }
    }
    if (!wroteAny) {
      console.log("No new changelogs were generated.");
    }
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
