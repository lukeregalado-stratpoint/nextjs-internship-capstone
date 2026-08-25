import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  cleanup()
})

// jsdom doesn't implement matchmedia - needed by theme-provider/theme-toggle
// and any tailwind dark-mode-aware component under test.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// dnd-kit and the calendar view both call resizeobserver; jsdom has none.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? (MockResizeObserver as unknown as typeof ResizeObserver)

// radix/shadcn-style menus call scrollintoview on the elements they focus.
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// window.confirm is used directly by kanban-board.tsx for delete
// confirmations. default to "confirm" so tests don't hang; override
// per-test with vi.spyon(window, "confirm").mockreturnvalue(false) to
// exercise the cancel path.
window.confirm = vi.fn().mockReturnValue(true)
