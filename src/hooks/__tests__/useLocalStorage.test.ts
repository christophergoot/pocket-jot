import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage, useDebouncedLocalStorage } from "../useLocalStorage";

// In-memory localStorage stand-in
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

beforeEach(() => localStorageMock.clear());

// ─── useLocalStorage ──────────────────────────────────────────────────────────

describe("useLocalStorage", () => {
  it("returns initial value when key is not in storage", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("reads existing value from localStorage on init", () => {
    store["key"] = JSON.stringify("already stored");
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("already stored");
  });

  it("updates state when setValue is called", () => {
    const { result } = renderHook(() => useLocalStorage("key", ""));
    act(() => result.current[1]("new value"));
    expect(result.current[0]).toBe("new value");
  });

  it("persists value to localStorage on setValue", () => {
    const { result } = renderHook(() => useLocalStorage("key", ""));
    act(() => result.current[1]("saved"));
    expect(JSON.parse(store["key"])).toBe("saved");
  });

  it("supports updater function (prev => next)", () => {
    const { result } = renderHook(() => useLocalStorage("count", 5));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(6);
  });

  it("updater function result is persisted to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));
    act(() => result.current[1]((prev) => prev + 10));
    expect(JSON.parse(store["count"])).toBe(10);
  });

  it("returns initialValue when stored JSON is invalid", () => {
    store["key"] = "not valid json {{{";
    const { result } = renderHook(() => useLocalStorage("key", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });

  it("handles object values correctly", () => {
    const obj = { name: "test", items: [1, 2, 3] };
    const { result } = renderHook(() =>
      useLocalStorage<typeof obj>("obj", { name: "", items: [] }),
    );
    act(() => result.current[1](obj));
    expect(result.current[0]).toEqual(obj);
    expect(JSON.parse(store["obj"])).toEqual(obj);
  });

  it("handles boolean values", () => {
    const { result } = renderHook(() => useLocalStorage("flag", false));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it("handles null as stored value", () => {
    store["key"] = JSON.stringify(null);
    const { result } = renderHook(() =>
      useLocalStorage<string | null>("key", "default"),
    );
    // JSON.parse(null) returns null, which is truthy-checked as false, so falls back
    // Actually JSON.stringify(null) === "null" which is truthy, so returns null
    expect(result.current[0]).toBeNull();
  });

  it("multiple calls with same key share the same initial read", () => {
    store["shared"] = JSON.stringify("stored");
    const { result: r1 } = renderHook(() => useLocalStorage("shared", "init"));
    const { result: r2 } = renderHook(() => useLocalStorage("shared", "init"));
    expect(r1.current[0]).toBe("stored");
    expect(r2.current[0]).toBe("stored");
  });
});

// ─── useDebouncedLocalStorage ─────────────────────────────────────────────────

describe("useDebouncedLocalStorage", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns initial value when key is not in storage", () => {
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "init", 500),
    );
    expect(result.current[0]).toBe("init");
  });

  it("reads existing value from localStorage on init", () => {
    store["key"] = JSON.stringify("from storage");
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "init", 500),
    );
    expect(result.current[0]).toBe("from storage");
  });

  it("state updates immediately when setValue is called", () => {
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "", 500),
    );
    act(() => result.current[1]("immediate"));
    expect(result.current[0]).toBe("immediate");
  });

  it("does NOT write to localStorage before delay elapses", () => {
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "", 500),
    );
    act(() => result.current[1]("not yet"));
    act(() => vi.advanceTimersByTime(499));
    expect(store["key"]).toBeUndefined();
  });

  it("writes to localStorage after delay elapses", () => {
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "", 500),
    );
    act(() => result.current[1]("saved after delay"));
    act(() => vi.advanceTimersByTime(500));
    expect(JSON.parse(store["key"])).toBe("saved after delay");
  });

  it("isSaving is true while debounce is pending", () => {
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "", 500),
    );
    // After mount the effect fires immediately, setting isSaving=true
    expect(result.current[2]).toBe(true);
  });

  it("isSaving becomes false after delay elapses", () => {
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "", 500),
    );
    act(() => vi.advanceTimersByTime(500));
    expect(result.current[2]).toBe(false);
  });

  it("rapid calls debounce — only final value is written", () => {
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "", 500),
    );
    act(() => result.current[1]("first"));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current[1]("second"));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current[1]("third"));
    act(() => vi.advanceTimersByTime(500));
    expect(JSON.parse(store["key"])).toBe("third");
  });

  it("returns invalid JSON as initialValue", () => {
    store["key"] = "bad json";
    const { result } = renderHook(() =>
      useDebouncedLocalStorage("key", "fallback", 500),
    );
    expect(result.current[0]).toBe("fallback");
  });
});
