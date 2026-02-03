import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PagePreviewProps {
  content: string;
  pageNumber: number;
  isSelected?: boolean;
  onClick?: () => void;
  showPageNumber?: boolean;
}

export function PagePreview({
  content,
  pageNumber,
  isSelected = false,
  onClick,
  showPageNumber = true,
}: PagePreviewProps) {
  return (
    <div
      onClick={onClick}
      className={`
        page-preview relative bg-white dark:bg-gray-800
        border-2 rounded-lg overflow-hidden
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-300 dark:border-gray-600'}
        ${onClick ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''}
      `}
    >
      {/* Page content */}
      <div className="absolute inset-0 p-2 overflow-hidden">
        <div className="prose-pocket text-gray-900 dark:text-gray-100 h-full overflow-hidden">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || ''}
          </ReactMarkdown>
        </div>
      </div>

      {/* Page number badge */}
      {showPageNumber && (
        <div className="absolute bottom-1 right-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-1.5 py-0.5 rounded font-medium">
          {pageNumber}
        </div>
      )}
    </div>
  );
}
