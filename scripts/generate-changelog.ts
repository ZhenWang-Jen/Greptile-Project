import { pipeline, SummarizationPipeline } from '@xenova/transformers';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Add this to suppress the warning about experimental support for custom fetch
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

class SummarizationManager {
  private static instance: SummarizationPipeline | null = null;

  static async getInstance(): Promise<SummarizationPipeline> {
    if (this.instance === null) {
      console.log('Initializing summarization pipeline for the first time...');
      this.instance = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6') as SummarizationPipeline;
      console.log('Pipeline initialized.');
    }
    return this.instance;
  }
}

async function getRecentCommits(days: number = 7): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Uses the git command directly, removing the need for simple-git
    const command = `git log --since="${days} days ago" --pretty=format:%s`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing git log: ${stderr}`);
        return reject(error);
      }
      resolve(stdout.split('\n').filter(Boolean)); // Split by newline and remove empty lines
    });
  });
}

function categorizeCommits(commits: string[]): Record<string, string[]> {
  // Remove duplicates first
  const uniqueCommits = [...new Set(commits)];
  
  const categories: Record<string, string[]> = {
    '🚀 Features': [],
    '🐛 Bug Fixes': [],
    '🧹 Chores': [],
    '📚 Documentation': [],
    '🔧 Refactoring': [],
    '⚡ Performance': [],
    '🔒 Security': [],
    '🎨 Style': [],
    '✅ Tests': [],
    '🚀 Deployments': [],
    '📦 Dependencies': [],
    '🔨 Build': [],
    '📱 Mobile': [],
    '🌐 Web': [],
    '💾 Database': [],
    '🔌 API': [],
    '🎯 Other': []
  };

  uniqueCommits.forEach(commit => {
    const lowerCommit = commit.toLowerCase();
    
    if (lowerCommit.includes('feat:') || lowerCommit.includes('feature:')) {
      categories['🚀 Features'].push(commit);
    } else if (lowerCommit.includes('fix:') || lowerCommit.includes('bug:') || lowerCommit.includes('hotfix:')) {
      categories['🐛 Bug Fixes'].push(commit);
    } else if (lowerCommit.includes('docs:') || lowerCommit.includes('documentation:')) {
      categories['📚 Documentation'].push(commit);
    } else if (lowerCommit.includes('refactor:') || lowerCommit.includes('refactoring:')) {
      categories['🔧 Refactoring'].push(commit);
    } else if (lowerCommit.includes('perf:') || lowerCommit.includes('performance:')) {
      categories['⚡ Performance'].push(commit);
    } else if (lowerCommit.includes('security:') || lowerCommit.includes('sec:')) {
      categories['🔒 Security'].push(commit);
    } else if (lowerCommit.includes('style:') || lowerCommit.includes('format:')) {
      categories['🎨 Style'].push(commit);
    } else if (lowerCommit.includes('test:') || lowerCommit.includes('tests:')) {
      categories['✅ Tests'].push(commit);
    } else if (lowerCommit.includes('deploy:') || lowerCommit.includes('deployment:')) {
      categories['🚀 Deployments'].push(commit);
    } else if (lowerCommit.includes('deps:') || lowerCommit.includes('dependency:') || lowerCommit.includes('dependencies:')) {
      categories['📦 Dependencies'].push(commit);
    } else if (lowerCommit.includes('build:') || lowerCommit.includes('ci:')) {
      categories['🔨 Build'].push(commit);
    } else if (lowerCommit.includes('mobile:') || lowerCommit.includes('ios:') || lowerCommit.includes('android:')) {
      categories['📱 Mobile'].push(commit);
    } else if (lowerCommit.includes('web:') || lowerCommit.includes('frontend:')) {
      categories['🌐 Web'].push(commit);
    } else if (lowerCommit.includes('db:') || lowerCommit.includes('database:')) {
      categories['💾 Database'].push(commit);
    } else if (lowerCommit.includes('api:') || lowerCommit.includes('endpoint:')) {
      categories['🔌 API'].push(commit);
    } else if (lowerCommit.includes('chore:') || lowerCommit.includes('maintenance:')) {
      categories['🧹 Chores'].push(commit);
    } else {
      categories['🎯 Other'].push(commit);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(key => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
}


async function generateChangelogFromCommits(categorizedCommits: Record<string, string[]>): Promise<string> {
  const summarizer = await SummarizationManager.getInstance();
  let changelog = '# Changelog\n\n';

  for (const category in categorizedCommits) {
    const commits = categorizedCommits[category];
    if (commits.length > 0) {
      changelog += `## ${category}\n`;
      
      if (commits.length === 1) {
        // For single commits, format them as user-friendly bullet points
        const commit = commits[0];
        const userFriendlyMessage = formatCommitForUsers(commit);
        changelog += `- ${userFriendlyMessage}\n\n`;
      } else {
        // For multiple commits, try AI summarization first, fallback to individual if poor quality
        console.log(`Summarizing ${commits.length} commits for ${category}...`);
        const textToSummarize = commits.join('. ');
        
        try {
          const summary = await summarizer(textToSummarize, {
            max_length: 80,
            min_length: 15,
          });
          // @ts-ignore
          const summaryText = summary[0].summary_text;
          const userFriendlySummary = formatSummaryForUsers(summaryText, category);
          
          // Check if the summary is of good quality (not repetitive, makes sense)
          if (isGoodSummary(userFriendlySummary)) {
            changelog += `- ${userFriendlySummary}\n\n`;
          } else {
            // Fallback to individual commits if AI summary is poor
            console.log(`AI summary quality poor, using individual commits for ${category}`);
            commits.forEach(commit => {
              const userFriendlyMessage = formatCommitForUsers(commit);
              changelog += `- ${userFriendlyMessage}\n`;
            });
            changelog += '\n';
          }
        } catch (error) {
          // Fallback to individual commits if AI fails
          console.log(`AI summarization failed, using individual commits for ${category}`);
          commits.forEach(commit => {
            const userFriendlyMessage = formatCommitForUsers(commit);
            changelog += `- ${userFriendlyMessage}\n`;
          });
          changelog += '\n';
        }
      }
    }
  }

  return changelog;
}

function isGoodSummary(summary: string): boolean {
  // Check for common AI summarization issues
  const issues = [
    /\.\.\./g, // Multiple dots
    /(\w+)\s+\1/g, // Repeated words
    /Ad\s/g, // Common AI typo
    /Add\s+Add/g, // Repetitive "Add"
    /\.\s*\./g, // Multiple periods
    /[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+/g, // Repetitive patterns
  ];
  
  for (const issue of issues) {
    if (issue.test(summary)) {
      return false;
    }
  }
  
  // Check if summary is too short or too repetitive
  const words = summary.split(' ');
  const uniqueWords = new Set(words);
  const repetitionRatio = uniqueWords.size / words.length;
  
  return summary.length > 10 && repetitionRatio > 0.6;
}

function formatCommitForUsers(commit: string): string {
  // Remove common prefixes and make it more user-friendly
  let formatted = commit
    .replace(/^feat:\s*/i, '')
    .replace(/^fix:\s*/i, '')
    .replace(/^chore:\s*/i, '')
    .replace(/^refactor:\s*/i, '')
    .replace(/^docs:\s*/i, '')
    .replace(/^test:\s*/i, '')
    .replace(/^style:\s*/i, '')
    .replace(/^perf:\s*/i, '')
    .replace(/^build:\s*/i, '')
    .replace(/^ci:\s*/i, '')
    .replace(/^revert:\s*/i, '')
    .replace(/^deps:\s*/i, '')
    .replace(/^security:\s*/i, '')
    .replace(/^deploy:\s*/i, '')
    .replace(/^mobile:\s*/i, '')
    .replace(/^web:\s*/i, '')
    .replace(/^db:\s*/i, '')
    .replace(/^api:\s*/i, '');

  // Capitalize first letter and add proper punctuation
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
    formatted += '.';
  }

  return formatted;
}

function formatSummaryForUsers(summary: string, category: string): string {
  // Clean up AI summary and make it more user-friendly
  let formatted = summary
    .replace(/\.\.\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove repetitive phrases that the AI often adds
  formatted = formatted
    .replace(/([^.]*)\1+/g, '$1') // Remove exact repetitions
    .replace(/(\w+)\s+\1/g, '$1') // Remove adjacent word repetitions
    .replace(/\.\s*\./g, '.') // Remove multiple dots
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Capitalize first letter and ensure proper punctuation
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
    formatted += '.';
  }

  return formatted;
}

async function createChangelogFile(content: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  const fileName = `${date}-changelog.md`;
  const filePath = path.join(process.cwd(), 'changelogs', fileName);

  const fileContent = `---
title: 'Changelog for ${date}'
date: '${date}'
---

${content}
`;

  fs.writeFileSync(filePath, fileContent);
  console.log(`Changelog created at ${filePath}`);
}

async function main() {
  try {
    console.log('Fetching recent commits...');
    const commits = await getRecentCommits(7);
    console.log(`Found ${commits.length} commits in the last 7 days.`);
    
    if (commits.length === 0) {
        console.log("No new commits to generate a changelog for.");
        return;
    }

    console.log('Categorizing commits...');
    const categorizedCommits = categorizeCommits(commits);
    
    console.log('Generating changelog with local AI...');
    const changelogContent = await generateChangelogFromCommits(categorizedCommits);

    if (changelogContent) {
      console.log('Creating changelog file...');
      await createChangelogFile(changelogContent);
    } else {
      console.log('No changelog content generated.');
    }
  } catch (error) {
    console.error('Error generating changelog:', error);
    process.exit(1);
  }
}

main(); 