import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"

/**
 * Theme picker on the Scoreboard system.
 *
 * The six lucide icons are gone. A theme is a set of colours, so the affordance
 * is a two-tone swatch of the theme's own background and primary — it previews
 * the thing it switches to, which an icon never did. Those colours cannot come
 * from the current theme's tokens (they belong to the other five), so they are
 * declared once as .theme-swatch-* classes in index.css rather than inlined
 * here; nothing in a component hardcodes a colour.
 */
const themes = [
    { key: 'light', name: 'LIGHT' },
    { key: 'dark', name: 'DARK' },
    { key: 'sage', name: 'SAGE' },
    { key: 'ocean', name: 'OCEAN' },
    { key: 'midnight', name: 'MIDNIGHT' },
    { key: 'turf', name: 'TURF' },
];

// Written out rather than built from the key so Tailwind's content scan and a
// reader both see the real class names.
const SWATCH = {
    light: 'theme-swatch theme-swatch-light',
    dark: 'theme-swatch theme-swatch-dark',
    sage: 'theme-swatch theme-swatch-sage',
    ocean: 'theme-swatch theme-swatch-ocean',
    midnight: 'theme-swatch theme-swatch-midnight',
    turf: 'theme-swatch theme-swatch-turf',
};

const ThemeSwitcher = ({ currentTheme, setTheme, variant = 'bar' }) => {
    const current = themes.find((t) => t.key === currentTheme) || themes[0];
    const row = variant === 'row';

    return (
        <DropdownMenu className={row ? 'block w-full' : 'flex'}>
            <DropdownMenuTrigger
                aria-label="Change theme"
                className={
                    row
                        ? 'flex min-h-[48px] w-full items-center justify-between border-l-2 border-transparent bg-panel pl-3 pr-4 text-[10px] font-medium tracking-[0.16em] text-muted-foreground'
                        : 'flex items-center gap-2 bg-panel px-3.5 text-[9px] font-medium tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground'
                }
            >
                <span>THEME</span>
                {row ? (
                    <span className="flex items-center gap-2 text-foreground">
                        <span className={SWATCH[current.key]} aria-hidden="true" />
                        {current.name}
                    </span>
                ) : (
                    <span className={SWATCH[current.key]} aria-hidden="true" />
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="right"
                className="w-[164px]"
            >
                {themes.map((theme) => {
                    const active = currentTheme === theme.key;
                    return (
                        <DropdownMenuItem
                            key={theme.key}
                            onClick={() => setTheme(theme.key)}
                            className={`flex min-h-[44px] items-center gap-2.5 px-3.5 text-[9px] font-medium tracking-[0.16em] hover:bg-muted ${
                                active ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                        >
                            <span className={SWATCH[theme.key]} aria-hidden="true" />
                            <span className="flex-1 text-left">{theme.name}</span>
                            {/* The active mark is structure, so it takes --primary. */}
                            {active && <span className="h-1.5 w-1.5 bg-primary" aria-hidden="true" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ThemeSwitcher;
