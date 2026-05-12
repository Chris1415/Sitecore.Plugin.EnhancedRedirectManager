"use client";

import { Icon } from "@/lib/icon";
import {
  mdiCheck,
  mdiMonitor,
  mdiWeatherNight,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isThemeSwitcherEnabled } from "@/lib/env-flags";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

const CHOICES: ReadonlyArray<{
  value: ThemeChoice;
  label: string;
  iconPath: string;
}> = [
  { value: "light", label: "Light", iconPath: mdiWhiteBalanceSunny },
  { value: "dark", label: "Dark", iconPath: mdiWeatherNight },
  { value: "system", label: "System", iconPath: mdiMonitor },
];

interface ThemeSwitcherProps {
  className?: string;
}

/**
 * Env-gated theme switcher. Renders nothing when
 * NEXT_PUBLIC_REDIRECT_MANAGER_THEME_SWITCHER is not "true".
 *
 * Inline component — parent surface decides placement. Designed to fit
 * into existing chrome (TopActionRow, card title row, etc.) as a ghost
 * icon-button so it fades into the toolbar.
 */
function ThemeSwitcher({ className }: ThemeSwitcherProps = {}) {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Standard next-themes mount-gate to avoid SSR hydration mismatch:
  // resolvedTheme is undefined on the server and known on the client.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!isThemeSwitcherEnabled()) {
    return null;
  }

  if (!mounted) {
    return null;
  }

  const currentChoice: ThemeChoice =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  const triggerIcon =
    resolvedTheme === "dark" ? mdiWeatherNight : mdiWhiteBalanceSunny;

  return (
    <div
      data-slot="theme-switcher"
      data-theme-switcher-enabled="true"
      className={cn("inline-flex", className)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Theme"
            title="Theme"
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon path={triggerIcon} className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {CHOICES.map((choice) => (
            <DropdownMenuItem
              key={choice.value}
              onSelect={() => setTheme(choice.value)}
              data-theme-choice={choice.value}
              aria-checked={choice.value === currentChoice}
              role="menuitemradio"
            >
              <Icon path={choice.iconPath} className="mr-2 h-4 w-4" />
              <span>{choice.label}</span>
              {choice.value === currentChoice ? (
                <Icon path={mdiCheck} className="ml-auto h-4 w-4" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export { ThemeSwitcher };
