import { PAGE_SEPARATORS, TOTAL_PAGES } from './constants';
import type { PageContent } from '../types';

/**
 * Parse markdown content into 8 pages using separators
 */
export function parseMarkdownIntoPages(markdown: string): PageContent[] {
  // Create a regex pattern that matches any of the separators
  // The --- separator should only match when it's on its own line (not part of YAML frontmatter)
  const separatorPattern = PAGE_SEPARATORS
    .map(sep => sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const regex = new RegExp(`^(?:${separatorPattern})$`, 'gm');

  // Split content by separators
  const parts = markdown.split(regex).map(part => part.trim());

  // Create page content array
  const pages: PageContent[] = [];

  for (let i = 0; i < TOTAL_PAGES; i++) {
    pages.push({
      pageNumber: i + 1,
      content: parts[i] || '',
    });
  }

  return pages;
}

/**
 * Combine pages back into markdown with separators
 */
export function combinePagesToMarkdown(pages: PageContent[]): string {
  return pages.map(page => page.content).join('\n\n---\n\n');
}

/**
 * Update a specific page's content in the full markdown
 */
export function updatePageContent(
  fullMarkdown: string,
  pageNumber: number,
  newContent: string
): string {
  const pages = parseMarkdownIntoPages(fullMarkdown);

  if (pageNumber >= 1 && pageNumber <= TOTAL_PAGES) {
    pages[pageNumber - 1].content = newContent;
  }

  return combinePagesToMarkdown(pages);
}
