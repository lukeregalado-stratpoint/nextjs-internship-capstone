"use client"

import { useTheme } from "./theme-provider"
import { Moon, Sun } from "lucide-react"
import Link from "next/link"
import { Show, SignInButton, UserButton } from "@clerk/nextjs"

function Logomark() {
  return (
    <span className="flex h-7 w-7 items-end gap-[3px] rounded-md border border-line bg-surface p-1 dark:border-line-dark dark:bg-surface-dark">
      <span className="h-full w-full rounded-[2px] bg-primary" />
      <span className="h-2/3 w-full rounded-[2px] bg-slate/50 dark:bg-slate-dark/50" />
      <span className="h-1/3 w-full rounded-[2px] bg-ink/20 dark:bg-paper/20" />
    </span>
  )
}

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm dark:border-line-dark dark:bg-paper-dark/90">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink dark:text-paper">
            <Logomark />
            WIP
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-slate transition-colors hover:text-ink dark:text-slate-dark dark:hover:text-paper">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-slate transition-colors hover:text-ink dark:text-slate-dark dark:hover:text-paper">
              Pricing
            </Link>
            <Link href="#about" className="text-sm text-slate transition-colors hover:text-ink dark:text-slate-dark dark:hover:text-paper">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label="Toggle theme"
              className="rounded-md border border-line p-2 text-slate transition-colors hover:border-primary hover:text-primary dark:border-line-dark dark:text-slate-dark"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-sm text-ink transition-colors hover:text-primary dark:text-paper">
                  Sign in
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </Show>

            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Dashboard
              </Link>
              <UserButton />
            </Show>
          </div>
        </div>
      </div>
    </header>
  )
}