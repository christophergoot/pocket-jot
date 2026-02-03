import { PagePreview } from './PagePreview';
import type { PageContent } from '../types';

interface BookletPreviewProps {
  pages: PageContent[];
  selectedPage: number;
  onPageSelect: (pageNumber: number) => void;
}

export function BookletPreview({
  pages,
  selectedPage,
  onPageSelect,
}: BookletPreviewProps) {
  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-3 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg w-full max-w-4xl">
      {pages.map((page) => (
        <PagePreview
          key={page.pageNumber}
          content={page.content}
          pageNumber={page.pageNumber}
          isSelected={selectedPage === page.pageNumber}
          onClick={() => onPageSelect(page.pageNumber)}
        />
      ))}
    </div>
  );
}
