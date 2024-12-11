import React from 'react';
import { Check, Palette, Sun, Moon, Leaf, Waves, Moon as MoonIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"

const themes = {
    light: {
        name: 'Light',
        icon: Sun,
        colors: {
            background: '0 0% 100%',
            foreground: '222 47% 11%',
            primary: '271 81% 56%',
            'primary-darker': '271 81% 46%',
            'primary-lighter': '271 81% 66%',
            muted: '210 40% 96%',
            card: '0 0% 100%',
        }
    },
    dark: {
        name: 'Dark',
        icon: Moon,
        colors: {
            background: '222 47% 11%',
            foreground: '210 40% 98%',
            primary: '271 81% 56%',
            'primary-darker': '271 81% 46%',
            'primary-lighter': '271 81% 66%',
            muted: '217 32% 17%',
            card: '222 47% 11%',
        }
    },
    sage: {
        name: 'Sage',
        icon: Leaf,
        colors: {
            background: '150 20% 96%',
            foreground: '150 40% 20%',
            primary: '150 40% 40%',
            'primary-darker': '150 40% 30%',
            'primary-lighter': '150 30% 50%',
            muted: '150 15% 90%',
            card: '0 0% 100%',
        }
    },
    ocean: {
        name: 'Ocean',
        icon: Waves,
        colors: {
            background: '200 20% 98%',
            foreground: '200 50% 20%',
            primary: '200 80% 50%',
            'primary-darker': '200 80% 40%',
            'primary-lighter': '200 70% 60%',
            muted: '200 15% 92%',
            card: '0 0% 100%',
        }
    },
    midnight: {
        name: 'Midnight',
        icon: MoonIcon,
        colors: {
            background: '230 35% 7%',
            foreground: '213 31% 91%',
            primary: '230 60% 50%',
            'primary-darker': '230 60% 40%',
            'primary-lighter': '230 50% 60%',
            muted: '230 25% 15%',
            card: '230 35% 7%',
        }
    }
};

const ThemeSwitcher = ({ currentTheme, setTheme }) => {
    const ThemeIcon = themes[currentTheme]?.icon || Palette;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted transition-colors w-full bg-muted/50">
                <span className="font-medium">Theme</span>
                <span className="text-muted-foreground text-sm ml-2">
                    {themes[currentTheme]?.name}
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="bottom"
                align="end"
                sideOffset={4}
                className="w-32 min-w-[8rem]"
            >
                {Object.entries(themes).map(([key, theme]) => (
                    <DropdownMenuItem
                        key={key}
                        onClick={() => setTheme(key)}
                        className="flex items-center justify-between py-1.5"
                    >
                        <span className="text-sm">{theme.name}</span>
                        {currentTheme === key && (
                            <Check className="h-4 w-4 text-primary ml-2" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
export default ThemeSwitcher;