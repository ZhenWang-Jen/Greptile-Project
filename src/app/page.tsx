import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface Changelog {
  slug: string;
  frontmatter: {
    [key: string]: any;
  };
  content: string; // This will be raw markdown
}

// Simple markdown to React components parser
function parseMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentList: string[] = [];
  let inList = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('# ')) {
      // Main heading - skip as we already have the title
      return;
    } else if (trimmedLine.startsWith('## ')) {
      // Subheading
      if (inList) {
        elements.push(<ul key={`list-${index}`} className="list-disc pl-6 mb-4">{currentList.map((item, i) => <li key={i} className="mb-1">{item}</li>)}</ul>);
        currentList = [];
        inList = false;
      }
      elements.push(<h3 key={index} className="text-xl font-semibold mt-6 mb-3 text-gray-800">{trimmedLine.substring(3)}</h3>);
    } else if (trimmedLine.startsWith('### ')) {
      // Sub-subheading
      if (inList) {
        elements.push(<ul key={`list-${index}`} className="list-disc pl-6 mb-4">{currentList.map((item, i) => <li key={i} className="mb-1">{item}</li>)}</ul>);
        currentList = [];
        inList = false;
      }
      elements.push(<h4 key={index} className="text-lg font-medium mt-4 mb-2 text-gray-700">{trimmedLine.substring(4)}</h4>);
    } else if (trimmedLine.startsWith('- ')) {
      // List item
      if (!inList) {
        inList = true;
      }
      currentList.push(trimmedLine.substring(2));
    } else if (trimmedLine === '') {
      // Empty line - end current list if any
      if (inList) {
        elements.push(<ul key={`list-${index}`} className="list-disc pl-6 mb-4">{currentList.map((item, i) => <li key={i} className="mb-1">{item}</li>)}</ul>);
        currentList = [];
        inList = false;
      }
    } else if (trimmedLine) {
      // Regular paragraph
      if (inList) {
        elements.push(<ul key={`list-${index}`} className="list-disc pl-6 mb-4">{currentList.map((item, i) => <li key={i} className="mb-1">{item}</li>)}</ul>);
        currentList = [];
        inList = false;
      }
      elements.push(<p key={index} className="mb-3 text-gray-600">{trimmedLine}</p>);
    }
  });

  // Handle any remaining list
  if (inList) {
    elements.push(<ul key="final-list" className="list-disc pl-6 mb-4">{currentList.map((item, i) => <li key={i} className="mb-1">{item}</li>)}</ul>);
  }

  return elements;
}

const getChangelogs = async (): Promise<Changelog[]> => {
  const changelogsDirectory = path.join(process.cwd(), 'changelogs');
  const fileNames = fs.readdirSync(changelogsDirectory);

  const changelogs = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, '');
    const filePath = path.join(changelogsDirectory, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      frontmatter: data,
      content, // Keep as raw markdown
    };
  });

  return changelogs.sort((a, b) => {
    if (a.frontmatter.date < b.frontmatter.date) {
      return 1;
    } else {
      return -1;
    }
  });
};

export default async function Home() {
  const changelogs = await getChangelogs();

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Changelog</h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-12">
          {changelogs.map((changelog) => (
            <article key={changelog.slug} className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <span className="text-lg font-semibold text-gray-900">
                    {new Date(changelog.frontmatter.date + 'T00:00:00').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{changelog.frontmatter.title}</h2>
              <div className="prose prose-lg max-w-none text-gray-900">
                {parseMarkdown(changelog.content)}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
