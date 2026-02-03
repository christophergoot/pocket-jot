import { useState, useCallback, useMemo } from 'react';
import { Toolbar } from './components/Toolbar';
import { MarkdownEditor } from './components/MarkdownEditor';
import { BookletPreview } from './components/BookletPreview';
import { useDebouncedLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { reflowContent } from './utils/pageReflow';
import { generatePocketModPdf } from './utils/pdfGenerator';
import { DEFAULT_CONTENT } from './utils/constants';

function App() {
  const [content, setContent, isSaving] = useDebouncedLocalStorage(
    'pocket-jot-content',
    DEFAULT_CONTENT,
    500
  );
  const [selectedPage, setSelectedPage] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { isDark } = useTheme();

  // Reflow content across pages automatically
  const pages = useMemo(() => {
    return reflowContent(content);
  }, [content]);

  // Handle PDF generation
  const handleGeneratePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePocketModPdf(pages, isDark);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [pages, isDark]);

  // Handle clear
  const handleClear = useCallback(() => {
    setContent('');
    setSelectedPage(1);
  }, [setContent]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Toolbar */}
      <Toolbar
        onGeneratePdf={handleGeneratePdf}
        onClear={handleClear}
        isGeneratingPdf={isGeneratingPdf}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor panel */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-hidden">
          <MarkdownEditor
            value={content}
            onChange={setContent}
            isSaving={isSaving}
            isDark={isDark}
          />
        </div>

        {/* Preview panel */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Booklet preview (all 8 pages) */}
          <div className="flex-1 p-4 overflow-auto flex flex-col">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">
              Booklet Preview
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <BookletPreview
                pages={pages}
                selectedPage={selectedPage}
                onPageSelect={setSelectedPage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
