import { useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Theme } from '../types';

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>('pocket-jot-theme', 'system');

  // Apply theme to document
  const applyTheme = useCallback((themeValue: Theme) => {
    const root = window.document.documentElement;
    const isDark =
      themeValue === 'dark' ||
      (themeValue === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
  }, []);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  }, [setTheme]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, setTheme, toggleTheme, isDark };
}
