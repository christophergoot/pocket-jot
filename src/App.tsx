import { useState, useCallback, useMemo } from "react";
import { Toolbar } from "./components/Toolbar";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { BookletPreview } from "./components/BookletPreview";
import {
  useLocalStorage,
  useDebouncedLocalStorage,
} from "./hooks/useLocalStorage";
import { useTheme } from "./hooks/useTheme";
import { reflowContent, generatePocketModPdf, DEFAULT_CONTENT } from "./lib";

function App() {
  const [content, setContent, isSaving] = useDebouncedLocalStorage(
    "pocket-jot-content",
    DEFAULT_CONTENT,
    500,
  );
  const [selectedPage, setSelectedPage] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showFoldLines, setShowFoldLines] = useLocalStorage(
    "pocket-jot-fold-lines",
    true,
  );
  const [highlightCover, setHighlightCover] = useLocalStorage(
    "pocket-jot-cover-border",
    false,
  );
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const { isDark } = useTheme();

  // Reflow content across pages automatically
  const pages = useMemo(() => {
    return reflowContent(content);
  }, [content]);

  // Handle PDF generation
  const handleGeneratePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      await generatePocketModPdf(pages, { showFoldLines, highlightCover });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [pages, showFoldLines, highlightCover]);

  // Handle clear
  const handleClear = useCallback(() => {
    setContent("");
    setSelectedPage(1);
  }, [setContent]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Toolbar */}
      <Toolbar
        onGeneratePdf={handleGeneratePdf}
        onClear={handleClear}
        isGeneratingPdf={isGeneratingPdf}
        showFoldLines={showFoldLines}
        onShowFoldLinesChange={setShowFoldLines}
        highlightCover={highlightCover}
        onHighlightCoverChange={setHighlightCover}
      />

      {/* Mobile tab bar */}
      <nav className="md:hidden flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => setActiveTab("edit")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "edit"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "preview"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Preview
        </button>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor panel */}
        <div
          className={`${activeTab === "edit" ? "flex" : "hidden"} md:flex flex-col w-full md:w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-hidden`}
        >
          <MarkdownEditor
            key={isDark ? "dark" : "light"}
            value={content}
            onChange={setContent}
            isSaving={isSaving}
            isDark={isDark}
          />
        </div>

        {/* Preview panel */}
        <div
          className={`${activeTab === "preview" ? "flex" : "hidden"} md:flex flex-col w-full md:w-1/2 overflow-hidden`}
        >
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
                highlightCover={highlightCover}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
