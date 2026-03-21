# Theme system (light / dark / system)

## Stack

- **React** (Vite) + **Tailwind CSS** `darkMode: 'class'`
- **CSS variables** in `src/index.css` (`:root` and `.dark`) for backgrounds, text, borders, cards, primary, destructive, chart helpers
- **Tailwind** maps semantic tokens in `tailwind.config.js`: `background`, `foreground`, `card`, `muted`, `border`, `primary`, `destructive`, `popover`, `sidebar`, etc.
- **React context**: `src/theme/ThemeContext.jsx` + `src/theme/themeStorage.js`

## Anti-flicker

`index.html` runs a small inline script **before** React loads. It reads `localStorage` key `taskpilot-theme` (`light` | `dark` | `system`) and applies the `dark` class on `<html>` to match **resolved** theme (for `system`, uses `prefers-color-scheme`).

## Using the toggle

- **`ThemeToggle`** (`src/components/ThemeToggle.jsx`) is used in **`TopNav`** (authenticated shell) and **`LoginPage`** (top-right).
- **`useTheme()`** returns `{ theme, setTheme, resolvedTheme }`:
  - `theme`: stored preference (`light` | `dark` | `system`)
  - `resolvedTheme`: actual UI theme (`light` | `dark`)
  - `setTheme('light' | 'dark' | 'system')`: updates storage and DOM

## Extending new components

1. Prefer **semantic classes** instead of raw `slate` / `white`:
   - Page/surface: `bg-background`, `text-foreground`
   - Secondary: `bg-muted`, `text-muted-foreground`
   - Cards/panels: `bg-card`, `text-card-foreground`, `border-border`
   - Actions: `bg-primary`, `text-primary-foreground`
   - Errors: `text-destructive`, borders `border-destructive/30` + `bg-destructive/10` as needed
2. Add **transitions**: `transition-colors duration-200` on interactive surfaces.
3. For **Recharts** or canvas/SVG that cannot use Tailwind, read `resolvedTheme` from `useTheme()` and branch stroke/fill colors (see `TaskAnalyticsChart.jsx`).
4. To add a **new token**, extend `:root` and `.dark` in `src/index.css`, then add to `tailwind.config.js` `theme.extend.colors` if you need a utility like `bg-foo`.

## Files touched

| Area | Files |
|------|--------|
| Tokens + base | `src/index.css`, `tailwind.config.js`, `index.html` |
| Provider | `src/main.jsx`, `src/theme/ThemeContext.jsx`, `src/theme/themeStorage.js` |
| Toggle | `src/components/ThemeToggle.jsx` |
| Shell | `Layout.jsx`, `TopNav.jsx`, `Sidebar.jsx` |
| UI primitives | `components/ui/button.jsx`, `card.jsx`, `badge.jsx`, `skeleton.jsx` |

Persistence key: **`taskpilot-theme`** in `localStorage`.
