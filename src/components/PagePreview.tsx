import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PagePreviewProps {
  content: string;
  pageNumber: number;
  isSelected?: boolean;
  onClick?: () => void;
  showPageNumber?: boolean;
  highlightCover?: boolean;
}

// Fixed dimensions matching PDF output (74mm x 105mm scaled)
const PAGE_WIDTH = 148;  // Display width in pixels
const PAGE_HEIGHT = 210; // Display height in pixels (maintains 74:105 ratio)

export function PagePreview({
  content,
  pageNumber,
  isSelected = false,
  onClick,
  showPageNumber = true,
  highlightCover = false,
}: PagePreviewProps) {
  return (
    <div
      onClick={onClick}
      style={{
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        minWidth: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
      }}
      className={`
        relative bg-white dark:bg-gray-800
        border-2 rounded-lg overflow-hidden
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-300 dark:border-gray-600'}
        ${onClick ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''}
      `}
    >
      {/* Page content - scaled to fit fixed dimensions */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          padding: '8px',
          fontSize: '7px',
          lineHeight: '1.3',
        }}
      >
        <div
          className={`prose-pocket text-gray-900 dark:text-gray-100 h-full overflow-hidden ${
            highlightCover ? 'border-gray-800 dark:border-gray-200 rounded-sm p-1' : ''
          }`}
          style={highlightCover ? { border: '2px double currentColor' } : undefined}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content || ''}
          </ReactMarkdown>
        </div>
      </div>

      {/* Page number badge */}
      {showPageNumber && (
        <div className="absolute bottom-1 right-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-medium" style={{ fontSize: '9px' }}>
          {pageNumber}
        </div>
      )}
    </div>
  );
}
