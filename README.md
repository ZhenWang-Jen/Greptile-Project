# AI-Powered Changelog Generator

This project is an AI-powered changelog generator. It consists of two parts:

1.  A **developer-facing tool** that uses a local, on-device AI to generate changelogs from your git commit history.
2.  A **public-facing website** that displays the generated changelogs in a clean and user-friendly way.

This tool is designed to streamline the process of creating and publishing changelogs, making it easier for developers to keep their users informed about new features, bug fixes, and improvements—all without needing an internet connection or external API keys.


## Demo

https://github.com/user-attachments/assets/06b7ea26-d321-4dd7-9a44-a371ef753b2a


## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- Git

### 1. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 2. Run the Public-Facing Website

To see the changelog website, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 3. Generate a Changelog

To generate a new changelog from your recent git commits:

1.  Make sure you have made some commits to your local repository.
2.  Run the following command:

    ```bash
    npm run changelog:generate
    ```

This will create a new markdown file in the `changelogs` directory with the AI-generated content. The new changelog will automatically appear on the website.

## Technical & Product Decisions: What and Why

### Next.js & React
Chosen for hybrid static/server rendering, fast load times, SEO, and wide community support.

### TypeScript
Ensures type safety and maintainability, especially as the codebase grows.

### Tailwind CSS
Enables rapid, consistent UI development; the typography plugin makes markdown look polished.

### Local AI with `@xenova/transformers`
Runs AI models locally for privacy, offline use, and no API costs.

### Node.js `child_process` for Git
Directly calls `git` for reliability and minimal dependencies.

### Keyword-Based Commit Categorization
Simple, transparent, and robust without needing custom models.

### Markdown for Changelogs
Human-readable, version-control-friendly, and integrates with static site generators.

### `gray-matter`, `marked`, `dompurify`
Lightweight, focused libraries for metadata parsing, markdown rendering, and HTML sanitization.

This setup creates a seamless experience for both the developer generating the changelog and the end-user viewing it.

## How it Works

1.  A **developer** runs `npm run changelog:generate`.
2.  The script calls `git log` to get recent commit messages.
3.  It categorizes the commits and uses the local AI from **`@xenova/transformers`** to summarize them.
4.  The script creates a new **markdown file** in the `changelogs` directory.
5.  When a user visits the website, the **Next.js server** reads all changelog files. It uses `marked` and `dompurify` to create safe, clean HTML.
6.  This pre-rendered HTML is sent to the user's browser, displaying a fast and beautifully formatted changelog.

This setup creates a seamless experience for both the developer generating the changelog and the end-user viewing it. 

## Why These Technical and Product Decisions?

### Next.js & React
- **Why:** Next.js offers both static and server-side rendering, which means the public changelog site loads quickly and is SEO-friendly, while also allowing dynamic features if needed. React is widely adopted, making the project accessible to contributors.

### TypeScript
- **Why:** TypeScript helps catch bugs early and makes the codebase easier to maintain as it grows, especially with multiple contributors.

### Tailwind CSS
- **Why:** Tailwind enables rapid prototyping and consistent styling without writing custom CSS for every component. The `@tailwindcss/typography` plugin styles the rendered markdown beautifully.

### Local AI with `@xenova/transformers`
