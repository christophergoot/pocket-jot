import { FileDown, Trash2, BookOpen } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface ToolbarProps {
  onGeneratePdf: () => void;
  onClear: () => void;
  isGeneratingPdf: boolean;
}

export function Toolbar({ onGeneratePdf, onClear, isGeneratingPdf }: ToolbarProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Logo / Title */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pocket Jot
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onGeneratePdf}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <FileDown className="w-4 h-4" />
          {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
        </button>

        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear all content?')) {
              onClear();
            }
          }}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          title="Clear content"
          aria-label="Clear content"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        <ThemeToggle />
      </div>
    </header>
  );
}
