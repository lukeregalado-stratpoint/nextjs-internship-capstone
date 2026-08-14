"use client"

import { useTheme } from "./theme-provider"
import { Moon, Sun } from "lucide-react"
import Link from "next/link"
import { Show, SignInButton, UserButton } from "@clerk/nextjs"

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
              <span className="h-7 w-7 rounded-xl bg-gradient-to-br from-primary to-accent" />
              TaskFlow
            </Link>
          </div>

          <nav className="hidden md:flex space-x-8">
            <Link
              href="#features"
              className="text-foreground dark:text-paper hover:text-primary transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-foreground dark:text-paper hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#about"
              className="text-foreground dark:text-paper hover:text-primary transition-colors"
            >
              About
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-xl bg-muted text-primary dark:text-paper hover:bg-muted transition-colors"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-foreground dark:text-paper hover:text-primary transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary transition-colors"
              >
                Get Started
              </Link>
            </Show>

            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary transition-colors"
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