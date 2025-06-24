import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface Changelog {
  slug: string;
  frontmatter: {
    [key: string]: any;
  };
  content: string;
}

function parseMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let currentList: string[] = [];
  let inList = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("## ")) {
      if (inList) {
        elements.push(
          <ul
            key={`list-${index}`}
            className="list-disc pl-6 mb-4 space-y-2 text-[var(--foreground)]"
          >
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        inList = false;
      }
      elements.push(
        <h2
          key={index}
          className="text-xl font-semibold text-[var(--brand-green)] mt-6 mb-4 tracking-tight uppercase"
        >
          {trimmedLine.substring(3)}
        </h2>
      );
    } else if (trimmedLine.startsWith("- ")) {
      if (!inList) {
        inList = true;
      }
      currentList.push(trimmedLine.substring(2));
    } else if (trimmedLine === "") {
      if (inList) {
        elements.push(
          <ul
            key={`list-${index}`}
            className="list-disc pl-6 mb-4 space-y-2 text-[var(--foreground)]"
          >
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        inList = false;
      }
    } else if (trimmedLine) {
      if (inList) {
        elements.push(
          <ul
            key={`list-${index}`}
            className="list-disc pl-6 mb-4 space-y-2 text-[var(--foreground)]"
          >
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        inList = false;
      }
      elements.push(
        <p key={index} className="text-[var(--foreground)] mb-4">
          {trimmedLine}
        </p>
      );
    }
  });

  if (inList) {
    elements.push(
      <ul
        key="last-list"
        className="list-disc pl-6 mb-4 space-y-2 text-[var(--foreground)]"
      >
        {currentList.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  return elements;
}

const getChangelogs = (): Changelog[] => {
  const changelogsDirectory = path.join(process.cwd(), "changelogs");
  if (!fs.existsSync(changelogsDirectory)) return [];

  return fs
    .readdirSync(changelogsDirectory)
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const filePath = path.join(changelogsDirectory, fileName);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContents);

      return {
        slug,
        frontmatter: data,
        content,
      };
    })
    .sort((a, b) =>
      a.frontmatter.date < b.frontmatter.date ? 1 : -1
    );
};

export default function Home() {
  const changelogs = getChangelogs();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <header className="text-center mb-16">
        <h1 className="text-5xl font-extrabold tracking-tight mb-2 text-[var(--brand-green)]">
          Product Updates
        </h1>
        <p className="text-lg mt-2 max-w-2xl mx-auto text-[var(--foreground)]">
          A timeline of the latest features, improvements, and fixes.
        </p>
      </header>

      <div className="space-y-12 text-[color:var(--foreground)]">
        {changelogs.map((changelog) => (
          <article
            key={changelog.slug}
            className="bg-[var(--card-background)] p-8 sm:p-10 border border-[var(--card-border)]"
          >
            <div className="border-b border-[var(--card-border)] pb-4 mb-6">
              <h2 className="text-2xl font-bold tracking-tight mb-1 text-[var(--brand-green)]">
                {changelog.frontmatter.title}
              </h2>
            </div>
            <div className="prose prose-lg max-w-none prose-h2:text-xl prose-h2:font-semibold prose-h2:text-[var(--brand-green)] prose-ul:text-[var(--foreground)]">
              {parseMarkdown(changelog.content)}
            </div>
          </article>
        ))}
        {changelogs.length === 0 && (
          <div className="text-center py-16 bg-[var(--card-background)] rounded-xl shadow-md border border-[var(--card-border)]">
            <h2 className="text-3xl font-bold text-[var(--brand-green)]">
              No changelogs yet!
            </h2>
            <p className="text-lg mt-4 ]">
              Run the generator to see your first product update here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
