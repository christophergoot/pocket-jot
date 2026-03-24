import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../useTheme";

// ─── Setup ────────────────────────────────────────────────────────────────────

const store: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  },
});

function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<() => void> = [];
  const mq = {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn((_event: string, cb: () => void) =>
      listeners.push(cb),
    ),
    removeEventListener: vi.fn(),
    // Helper to simulate system preference change in tests
    _triggerChange: (newValue: boolean) => {
      mq.matches = newValue;
      listeners.forEach((cb) => cb());
    },
  };
  window.matchMedia = vi.fn().mockReturnValue(mq);
  return mq;
}

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-color-mode");
  mockMatchMedia(false); // default: system prefers light
});

// ─── Default state ────────────────────────────────────────────────────────────

describe("useTheme — defaults", () => {
  it("defaults to system theme when nothing is stored", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
  });

  it("reads stored theme from localStorage", () => {
    store["pocket-jot-theme"] = JSON.stringify("dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });
});

// ─── isDark computation ───────────────────────────────────────────────────────

describe("useTheme — isDark", () => {
  it("isDark is false when theme is light", () => {
    mockMatchMedia(true); // system dark, but explicit theme is light
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("light"));
    expect(result.current.isDark).toBe(false);
  });

  it("isDark is true when theme is dark", () => {
    mockMatchMedia(false); // system light, but explicit theme is dark
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(result.current.isDark).toBe(true);
  });

  it("isDark is false when theme is system and system prefers light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    // theme stays 'system'
    expect(result.current.isDark).toBe(false);
  });

  it("isDark is true when theme is system and system prefers dark", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(true);
  });
});

// ─── DOM side effects ─────────────────────────────────────────────────────────

describe("useTheme — DOM class and data-color-mode", () => {
  it("sets dark class on documentElement for dark theme", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("sets light class on documentElement for light theme", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("light"));
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it('sets data-color-mode="dark" for dark theme', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(document.documentElement.getAttribute("data-color-mode")).toBe(
      "dark",
    );
  });

  it('sets data-color-mode="light" for light theme', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("light"));
    expect(document.documentElement.getAttribute("data-color-mode")).toBe(
      "light",
    );
  });

  it("system theme with dark preference applies dark class", () => {
    mockMatchMedia(true);
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("system theme with light preference applies light class", () => {
    mockMatchMedia(false);
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});

// ─── toggleTheme ──────────────────────────────────────────────────────────────

describe("useTheme — toggleTheme cycle", () => {
  it("cycles light → dark → system → light", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("light"));
    expect(result.current.theme).toBe("light");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("system");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });
});

// ─── persistence ─────────────────────────────────────────────────────────────

describe("useTheme — persistence", () => {
  it("persists theme to localStorage when setTheme is called", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));
    expect(JSON.parse(store["pocket-jot-theme"])).toBe("dark");
  });

  it("toggleTheme persists the new theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("light"));
    act(() => result.current.toggleTheme());
    expect(JSON.parse(store["pocket-jot-theme"])).toBe("dark");
  });
});

// ─── system media query listener ─────────────────────────────────────────────

describe("useTheme — system media query listener", () => {
  it("attaches media query listener when theme is system", () => {
    const mq = mockMatchMedia(false);
    renderHook(() => useTheme()); // defaults to 'system'
    expect(mq.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("does NOT attach listener when theme is light", () => {
    const mq = mockMatchMedia(false);
    store["pocket-jot-theme"] = JSON.stringify("light");
    renderHook(() => useTheme());
    expect(mq.addEventListener).not.toHaveBeenCalled();
  });

  it("does NOT attach listener when theme is dark", () => {
    const mq = mockMatchMedia(false);
    store["pocket-jot-theme"] = JSON.stringify("dark");
    renderHook(() => useTheme());
    expect(mq.addEventListener).not.toHaveBeenCalled();
  });

  it("removes listener on cleanup", () => {
    const mq = mockMatchMedia(false);
    const { unmount } = renderHook(() => useTheme());
    unmount();
    expect(mq.removeEventListener).toHaveBeenCalled();
  });
});
