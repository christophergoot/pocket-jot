import MDEditor, { commands, ICommand, TextState, TextAreaTextApi } from '@uiw/react-md-editor';
import { LayoutList } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  isSaving?: boolean;
  isDark: boolean;
}

/**
 * Parse text and add page separators between top-level list items
 */
function formatListToPages(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let isFirstTopLevel = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a top-level list item (starts with - or * or + followed by space, no leading whitespace)
    const isTopLevelItem = /^[-*+]\s+/.test(line);

    if (isTopLevelItem && !isFirstTopLevel) {
      // Add page separator before this top-level item (but not the first one)
      result.push('---');
    }

    if (isTopLevelItem) {
      isFirstTopLevel = false;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Custom command to format lists into pages
 */
const formatListCommand: ICommand = {
  name: 'format-list',
  keyCommand: 'format-list',
  buttonProps: { 'aria-label': 'Format list to pages', title: 'Format list to pages (split top-level items)' },
  icon: (
    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <LayoutList size={12} />
    </span>
  ),
  execute: (state: TextState, api: TextAreaTextApi) => {
    // Get selected text, or use all text if nothing selected
    const selectedText = state.selectedText || state.text;

    if (!selectedText.trim()) {
      return;
    }

    const formattedText = formatListToPages(selectedText);

    if (state.selectedText) {
      // Replace selection with formatted text
      api.replaceSelection(formattedText);
    } else {
      // Replace all text
      api.setSelectionRange({ start: 0, end: state.text.length });
      api.replaceSelection(formattedText);
    }
  },
};

export function MarkdownEditor({ value, onChange, isSaving, isDark }: MarkdownEditorProps) {
  return (
    <div className="h-full flex flex-col" data-color-mode={isDark ? 'dark' : 'light'}>
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Markdown Editor
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">---</code> to separate pages
          </span>
          {isSaving !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          preview="edit"
          height="100%"
          visibleDragbar={false}
          commands={[
            commands.bold,
            commands.italic,
            commands.strikethrough,
            commands.divider,
            commands.title1,
            commands.title2,
            commands.title3,
            commands.divider,
            commands.unorderedListCommand,
            commands.orderedListCommand,
            commands.checkedListCommand,
            commands.divider,
            commands.quote,
            commands.code,
            commands.codeBlock,
            commands.divider,
            commands.link,
            commands.image,
            commands.divider,
            commands.hr,
            commands.divider,
            formatListCommand,
          ]}
          extraCommands={[
            commands.codeEdit,
            commands.codeLive,
            commands.codePreview,
          ]}
        />
      </div>
    </div>
  );
}
