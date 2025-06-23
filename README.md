# AI-Powered Changelog Generator

This project is an AI-powered changelog generator. It consists of two parts:

1.  A **developer-facing tool** that uses a local, on-device AI to generate changelogs from your git commit history.
2.  A **public-facing website** that displays the generated changelogs in a clean and user-friendly way.

This tool is designed to streamline the process of creating and publishing changelogs, making it easier for developers to keep their users informed about new features, bug fixes, and improvements—all without needing an internet connection or external API keys.

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
    *Note: The first time you run this command, it will download the local AI model (a few hundred megabytes). Subsequent runs will be much faster.*

This will create a new markdown file in the `changelogs` directory with the AI-generated content. The new changelog will automatically appear on the website.

## Technical Decisions

### Framework and Language

-   **Next.js & React**: Chosen for its hybrid static & server rendering capabilities, perfect for a fast public changelog and a server-side generation script.
-   **TypeScript**: Used to ensure type safety, making the code more robust and easier to maintain.
-   **Tailwind CSS**: For rapid UI development with a utility-first approach. The `@tailwindcss/typography` plugin styles the rendered markdown beautifully.

### Changelog Generation

-   **`@xenova/transformers`**: This is the core of the AI. It runs a powerful summarization model directly on your machine, removing the need for API keys and enabling offline use.
-   **Node.js `child_process`**: To get the git history, we call the `git` command directly using this built-in Node.js module. This avoids adding an extra dependency for a simple task.
-   **Commit Categorization**: The script uses a keyword-based approach to categorize commits into logical groups like Features and Fixes before summarizing them.

### Content Management & Rendering

-   **Markdown Files**: Changelogs are stored as simple markdown files, which is simple and version-control-friendly.
-   **`gray-matter`**: A tiny, essential library to parse the metadata (title, date) from the top of the markdown files for sorting and display.
-   **`marked` & `dompurify`**: To display the changelogs, `marked` first converts the markdown content to HTML on the server. Then, `dompurify` sanitizes this HTML to prevent security vulnerabilities (XSS) before it's sent to the user's browser. This server-side approach ensures a fast and secure experience.

## How it Works

1.  A **developer** runs `npm run changelog:generate`.
2.  The script calls `git log` to get recent commit messages.
3.  It categorizes the commits and uses the local AI from **`@xenova/transformers`** to summarize them.
4.  The script creates a new **markdown file** in the `changelogs` directory.
5.  When a user visits the website, the **Next.js server** reads all changelog files. It uses `marked` and `dompurify` to create safe, clean HTML.
6.  This pre-rendered HTML is sent to the user's browser, displaying a fast and beautifully formatted changelog.

This setup creates a seamless experience for both the developer generating the changelog and the end-user viewing it. 