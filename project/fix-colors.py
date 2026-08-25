#!/usr/bin/env python3
"""
Bulk-replaces old Tailwind color tokens (outer_space, platinum, paynes_gray,
french_gray, lavender, blue_munsell, mint) with the new semantic tokens from
globals.css (foreground, muted-foreground, card, border, primary, ring, etc).

Usage:
    cd nextjs-internship-capstone/project
    python3 fix-colors.py

It walks app/ and components/, rewriting .tsx/.ts/.css files in place.
Run your grep again afterward - a handful of one-off combinations (unusual
shades, typos like missing spaces between classes) won't match and will need
a manual look, the script will print any files where an old token is still
found after replacement.
"""

import re
from pathlib import Path

ROOTS = ["app", "components"]
EXTENSIONS = {".tsx", ".ts", ".css"}

# Ordered longest-phrase-first so multi-class combos get replaced as a unit
# before their individual pieces would be (which prevents mismatched pairs
# like text-foreground dark:text-platinum-500 being left behind).
REPLACEMENTS: list[tuple[str, str]] = [
    # --- surfaces (bg pairs) ---
    ("bg-white dark:bg-outer_space-600", "bg-background"),
    ("bg-platinum-900 dark:bg-outer_space-600", "bg-muted"),
    ("bg-white dark:bg-outer_space-500", "bg-card"),
    ("bg-white dark:bg-outer_space-400", "bg-card"),
    ("hover:bg-white dark:hover:bg-outer_space-500", "hover:bg-card"),
    ("bg-white/50 dark:bg-outer_space-400/50", "bg-card/50"),
    ("bg-white/80 dark:bg-outer_space-500/80", "bg-card/80"),
    ("bg-white/70 dark:bg-outer_space-500/60", "bg-card/70"),
    ("bg-white/95 dark:bg-outer_space-500/95", "bg-card/95"),
    ("ring-white dark:ring-outer_space-500", "ring-card"),

    # footer: intentionally dark regardless of theme -> fixed (non-adaptive) tokens
    ("bg-outer_space-500 dark:bg-outer_space-600", "bg-ink"),
    ("text-platinum-500", "text-paper"),
    ("border-t border-paynes_gray-400", "border-t border-white/10"),
    ("text-french_gray-400 hover:text-platinum-500", "text-paper/60 hover:text-paper"),
    ("text-french_gray-400", "text-paper/60"),

    # --- text pairs ---
    ("text-outer_space-500 dark:text-platinum-500", "text-foreground"),
    ("hover:text-outer_space-500 dark:hover:text-platinum-500", "hover:text-foreground"),
    ("text-paynes_gray-500 dark:text-french_gray-400", "text-muted-foreground"),
    ("text-paynes_gray-500 dark:text-french_gray-500", "text-muted-foreground"),
    ("text-paynes_gray-400 dark:text-french_gray-600", "text-muted-foreground"),
    ("text-paynes_gray-600 dark:text-french_gray-300", "text-muted-foreground"),
    ("placeholder-paynes_gray-500 dark:placeholder-french_gray-400", "placeholder-muted-foreground"),

    # --- accent text/icons (lavender/blue_munsell used as the app's accent) ---
    ("text-lavender-700 dark:text-lavender-300", "text-primary"),
    ("text-lavender-600 dark:text-lavender-300", "text-primary"),
    ("text-lavender-600 dark:text-lavender-400", "text-primary"),
    ("text-lavender-500 dark:text-lavender-300", "text-primary"),
    ("text-blue_munsell-700 dark:text-blue_munsell-300", "text-primary"),
    ("hover:text-lavender-600", "hover:text-primary"),
    ("hover:text-blue_munsell-500", "hover:text-primary"),
    ("text-lavender-700", "text-primary"),
    ("text-lavender-600", "text-primary"),
    ("text-lavender-500", "text-primary"),
    ("text-blue_munsell-600", "text-primary"),
    ("text-blue_munsell-500", "text-primary"),
    ("text-blue_munsell-400", "text-primary"),

    # --- washes / pills (accent-tinted backgrounds) ---
    ("bg-lavender-100 text-lavender-700 dark:bg-paynes_gray-400 dark:text-platinum-500", "bg-primary/10 text-primary"),
    ("bg-blue_munsell-100 dark:bg-blue_munsell-900 text-blue_munsell-700 dark:text-blue_munsell-300", "bg-primary/10 text-primary"),
    ("text-lavender-600 bg-lavender-100", "text-primary bg-primary/10"),
    ("text-blue_munsell-600 bg-blue_munsell-100", "text-primary bg-primary/10"),
    ("bg-lavender-200 dark:bg-lavender-700/50", "bg-primary/15"),
    ("text-lavender-700 dark:text-lavender-200", "text-primary"),
    ("bg-blue_munsell-100 dark:bg-blue_munsell-900", "bg-primary/10"),
    ("bg-lavender-100 dark:bg-paynes_gray-400", "bg-muted"),
    ("bg-lavender-100 dark:bg-paynes_gray-500/40", "bg-muted"),
    ("bg-lavender-100 dark:bg-paynes_gray-500", "bg-muted"),
    ("bg-french_gray-300 dark:bg-paynes_gray-400", "bg-muted"),

    # --- hover washes ---
    ("hover:bg-lavender-50 dark:hover:bg-paynes_gray-500/20", "hover:bg-muted"),
    ("hover:bg-lavender-50 dark:hover:bg-paynes_gray-400/40", "hover:bg-muted"),
    ("hover:bg-lavender-50 dark:hover:bg-paynes_gray-400", "hover:bg-muted"),
    ("hover:bg-lavender-100/70 hover:text-outer_space-500 dark:hover:bg-paynes_gray-400/50 dark:hover:text-platinum-500", "hover:bg-muted hover:text-foreground"),
    ("hover:bg-lavender-100 dark:hover:bg-paynes_gray-400", "hover:bg-muted"),
    ("hover:bg-lavender-200 dark:hover:bg-paynes_gray-400", "hover:bg-muted"),
    ("hover:bg-platinum-500 dark:hover:bg-paynes_gray-400", "hover:bg-muted"),
    ("bg-lavender-50 dark:bg-paynes_gray-500/40", "bg-muted"),
    ("bg-lavender-50 dark:bg-paynes_gray-400/20", "bg-muted"),
    ("bg-lavender-50/60 dark:bg-paynes_gray-400/10", "bg-muted/60"),
    ("bg-lavender-50/60 dark:bg-lavender-500/10", "bg-primary/5"),

    # --- borders ---
    ("border-french_gray-300 dark:border-paynes_gray-400", "border-border"),
    ("border-lavender-100 dark:border-paynes_gray-400", "border-border"),
    ("border-lavender-200 dark:border-paynes_gray-400", "border-border"),
    ("border-lavender-100/80 dark:border-transparent", "border-border/80 dark:border-transparent"),
    ("border-lavender-400 bg-lavender-50/60 dark:bg-lavender-500/10", "border-primary bg-primary/5"),
    ("hover:border-lavender-300 dark:hover:border-lavender-500/50", "hover:border-primary/50"),
    ("border-lavender-400", "border-primary"),

    # --- focus rings ---
    ("focus:ring-2 focus:ring-lavender-400", "focus:ring-2 focus:ring-ring"),
    ("focus:ring-2 focus:ring-blue_munsell-500", "focus:ring-2 focus:ring-ring"),
    ("ring-2 ring-lavender-400/60", "ring-2 ring-ring/60"),
    ("peer-focus-visible:ring-2 peer-focus-visible:ring-lavender-300", "peer-focus-visible:ring-2 peer-focus-visible:ring-ring"),

    # --- primary buttons/swatches ---
    ("bg-lavender-500 text-white hover:bg-lavender-600", "bg-primary text-primary-foreground hover:bg-primary/90"),
    ("bg-blue_munsell-500 text-white hover:bg-blue_munsell-600", "bg-primary text-primary-foreground hover:bg-primary/90"),
    ("border-2 border-blue_munsell-500 text-blue_munsell-500 rounded-lg hover:bg-blue_munsell-50 dark:hover:bg-blue_munsell-900",
     "border-2 border-primary text-primary rounded-lg hover:bg-primary/10"),
    ("bg-lavender-500 border-lavender-500 text-white opacity-100", "bg-primary border-primary text-primary-foreground opacity-100"),
    ("bg-gradient-to-br from-lavender-400 to-mint-400", "bg-gradient-to-br from-primary to-accent"),
    ("bg-gradient-to-r from-lavender-400 to-mint-400", "bg-gradient-to-r from-primary to-accent"),
    ("bg-lavender-500", "bg-primary"),
    ("bg-blue_munsell-500", "bg-primary"),

    # --- calendar-view.css custom properties ---
    ("var(--color-outer_space-500)", "var(--color-foreground)"),
    ("var(--color-platinum-500)", "var(--color-foreground)"),
    ("var(--color-paynes_gray-500)", "var(--color-muted-foreground)"),
    ("var(--color-french_gray-500)", "var(--color-muted-foreground)"),
    ("var(--color-lavender-500)", "var(--color-primary)"),
    ("var(--color-lavender-600)", "var(--color-primary)"),
    ("var(--color-blue_munsell-500)", "var(--color-primary)"),

    # --- ui/skeleton.tsx ---
    ("bg-french_gray-200 dark:bg-paynes_gray-400/60", "bg-muted"),

    # --- app/page.tsx hero gradient backdrop ---
    ("bg-gradient-to-br from-platinum-900 to-platinum-800 dark:from-outer_space-500 dark:to-paynes_gray-500", "bg-muted"),

    # --- theme-toggle.tsx (distinct combo not used elsewhere) ---
    ("bg-platinum-500 dark:bg-paynes_gray-500", "bg-muted"),
    ("hover:bg-french_gray-500 dark:hover:bg-paynes_gray-400", "hover:bg-muted"),
]

# IMPORTANT: sort longest-first so multi-class combos always match before
# their individual pieces would be replaced out from under them. This is
# what actually enforces "most specific first" - list order alone doesn't,
# since a standalone rule earlier in the list can silently consume part of
# a combo that appears later, leaving the rest of that combo stranded.
REPLACEMENTS.sort(key=lambda pair: len(pair[0]), reverse=True)

# Catch-all fallbacks for any remaining standalone tokens not covered above
FALLBACKS: list[tuple[str, str]] = [
    (re.compile(r"\btext-outer_space-\d+\b"), "text-foreground"),
    (re.compile(r"\btext-platinum-\d+\b"), "text-foreground"),
    (re.compile(r"\btext-paynes_gray-\d+\b"), "text-muted-foreground"),
    (re.compile(r"\btext-french_gray-\d+\b"), "text-muted-foreground"),
    (re.compile(r"\bbg-outer_space-\d+(/\d+)?\b"), "bg-card"),
    (re.compile(r"\bdark:bg-outer_space-\d+(/\d+)?\b"), "dark:bg-card"),
    (re.compile(r"\bbg-paynes_gray-\d+(/\d+)?\b"), "bg-muted"),
    (re.compile(r"\bdark:bg-paynes_gray-\d+(/\d+)?\b"), "dark:bg-muted"),
    (re.compile(r"\bborder-paynes_gray-\d+\b"), "border-border"),
    (re.compile(r"\bborder-french_gray-\d+\b"), "border-border"),
    (re.compile(r"\bborder-lavender-\d+\b"), "border-primary"),
    (re.compile(r"\btext-lavender-\d+\b"), "text-primary"),
    (re.compile(r"\bbg-lavender-\d+\b"), "bg-primary"),
    (re.compile(r"\btext-blue_munsell-\d+\b"), "text-primary"),
    (re.compile(r"\bbg-blue_munsell-\d+\b"), "bg-primary"),
    (re.compile(r"\bring-outer_space-\d+\b"), "ring-card"),
]

OLD_TOKEN_RE = re.compile(
    r"outer_space|platinum|paynes_gray|french_gray|lavender|blue_munsell|mint"
)


def process_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text

    for old, new in REPLACEMENTS:
        text = text.replace(old, new)

    for pattern, new in FALLBACKS:
        text = pattern.sub(new, text)

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = []
    still_flagged = []

    for root_name in ROOTS:
        root = Path(root_name)
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.suffix not in EXTENSIONS or not path.is_file():
                continue
            if process_file(path):
                changed.append(path)
            if OLD_TOKEN_RE.search(path.read_text(encoding="utf-8")):
                still_flagged.append(path)

    print(f"Updated {len(changed)} file(s).")
    if still_flagged:
        print("\nThese still contain an old token after the automated pass -")
        print("open them and check manually (likely a one-off combo the script didn't cover):")
        for p in still_flagged:
            print(f"  {p}")
    else:
        print("No old tokens remain in app/ or components/.")


if __name__ == "__main__":
    main()