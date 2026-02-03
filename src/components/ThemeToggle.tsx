import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../types';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const icons: Record<Theme, React.ReactNode> = {
    light: <Sun className="w-5 h-5" />,
    dark: <Moon className="w-5 h-5" />,
    system: <Monitor className="w-5 h-5" />,
  };

  const labels: Record<Theme, string> = {
    light: 'Light mode',
    dark: 'Dark mode',
    system: 'System theme',
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={labels[theme]}
      aria-label={labels[theme]}
    >
      {icons[theme]}
    </button>
  );
}
