"use client";

import { Monitor, Moon, Sun } from "reicon-react";
import { type ThemePreference, useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const options = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}[];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const active = options.find((option) => option.value === theme) ?? options[0];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="theme-toggle-button focus-ring"
              aria-label={`Theme: ${active.label}`}
              data-testid="theme-trigger"
            >
              <ActiveIcon aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Choose color theme</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        side="top"
        sideOffset={10}
        className="z-[10002] w-44 rounded-[0.2rem] border border-border bg-popover p-1.5"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[0.64rem] uppercase tracking-[0.2em]">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as ThemePreference)}
        >
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                className="min-h-11 rounded-[0.15rem] px-2.5 pr-8"
              >
                <Icon aria-hidden="true" className="size-3.5" />
                <span>{option.label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
