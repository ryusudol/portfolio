"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Briefcase,
  Code,
  Envelope,
  GraduationCap,
  Home,
  Menu,
  Monitor,
  Moon,
  Puzzle,
  Star,
  Sun,
} from "reicon-react";

import { PortraitAvatar } from "@/components/portrait-avatar";
import { type ThemePreference, useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";

const TRANSITION_DURATION = 400;

const navigation = [
  { href: "/#home", label: "Home", icon: Home },
  { href: "/#experience", label: "Experience", icon: Briefcase },
  { href: "/#work", label: "Selected work", icon: Star },
  { href: "/#background", label: "Background", icon: GraduationCap },
  { href: "/#stack", label: "Tech stack", icon: Code },
  { href: "/#playground", label: "Playground", icon: Puzzle },
] as const;

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[];

const profileStatuses = [
  { label: "Software Engineer", kind: "role" },
  {
    label: "Open to new-grad SWE roles",
    kind: "availability",
  },
  { label: "suhyeon.yu.2789@gmail.com", kind: "email" },
] as const;

export function ProfileMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [previousStatusIndex, setPreviousStatusIndex] = useState<number | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverOpenedRef = useRef(false);
  const transitioningRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) return;

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setStatusIndex((current) => {
        setPreviousStatusIndex(current);
        return (current + 1) % profileStatuses.length;
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [open]);

  const focusMenuItem = useCallback((index = 0) => {
    window.requestAnimationFrame(() => {
      const items =
        panelRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]");
      items?.[index]?.focus();
    });
  }, []);

  const beginTransitionGuard = useCallback(() => {
    transitioningRef.current = true;
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      transitioningRef.current = false;
      transitionTimeoutRef.current = null;
    }, TRANSITION_DURATION);
  }, []);

  const closeMenu = useCallback((restoreFocus = false) => {
    hoverOpenedRef.current = false;
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        hoverOpenedRef.current = false;
        beginTransitionGuard();
        setOpen((current) => {
          const next = !current;
          if (next) {
            focusMenuItem();
          } else {
            window.requestAnimationFrame(() => triggerRef.current?.focus());
          }
          return next;
        });
      }

      if (event.key === "Escape") {
        closeMenu(true);
      }
    };

    const handleOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    window.addEventListener("pointerdown", handleOutsidePointer);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
      window.removeEventListener("pointerdown", handleOutsidePointer);
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [beginTransitionGuard, closeMenu, focusMenuItem]);

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && !open && !transitioningRef.current) {
      hoverOpenedRef.current = true;
      setOpen(true);
    }
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && !transitioningRef.current) {
      closeMenu();
    }
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      focusMenuItem();
    }
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [],
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number | undefined;

    if (event.key === "ArrowDown") {
      next = current < 0 ? 0 : (current + 1) % items.length;
    } else if (event.key === "ArrowUp") {
      next = current <= 0 ? items.length - 1 : current - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = items.length - 1;
    }

    if (next !== undefined) {
      event.preventDefault();
      items[next]?.focus();
    }
  }

  return (
    <div
      ref={rootRef}
      className="profile-menu fixed top-12 left-1/2 z-50 w-[min(20rem,calc(100vw-2rem))] max-[420px]:w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[1.6rem] border border-border bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] shadow-[0_10px_15px_-3px_rgb(62_54_47/6%),0_4px_6px_-4px_rgb(62_54_47/6%)] backdrop-blur-sm transition-[width,border-radius,box-shadow] duration-panel ease-out animate-profile-enter motion-reduce:animate-none motion-reduce:transition-none max-sm:top-4 dark:shadow-[0_10px_15px_-3px_rgb(0_0_0/20%),0_4px_6px_-4px_rgb(0_0_0/20%)] data-[open=true]:w-[min(25rem,calc(100vw-4rem))] data-[open=true]:max-[420px]:w-[calc(100vw-2rem)] data-[open=true]:rounded-b-xl data-[open=true]:shadow-[0_25px_50px_-12px_rgb(62_54_47/25%)] data-[open=true]:dark:shadow-[0_25px_50px_-12px_rgb(0_0_0/50%)]"
      data-open={open}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        className="profile-menu-trigger h-auto min-h-[3.45rem] w-full justify-start gap-[0.7rem] rounded-none border-0 bg-transparent p-[0.4rem] text-left hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent dark:aria-expanded:bg-transparent focus-visible:border-transparent focus-visible:ring-0 active:translate-y-0"
        data-testid="profile-menu-trigger"
        aria-expanded={open}
        aria-controls="profile-menu-panel"
        aria-label={open ? "Close profile menu" : "Open profile menu"}
        onClick={() => {
          if (hoverOpenedRef.current) {
            hoverOpenedRef.current = false;
            setOpen(true);
            return;
          }
          beginTransitionGuard();
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="flex min-w-0 flex-1 items-center">
          <PortraitAvatar
            className="profile-avatar-frame size-[2.65rem] after:border-0"
            imageClassName="profile-avatar"
            imageSize={160}
            priority
          />
          <span className="profile-menu-copy ml-[0.6rem] flex min-w-0 flex-1 flex-col leading-[1.25]">
            <span className="truncate text-[0.94rem] font-normal">
              Suhyeon Yu
            </span>
            <span
              className="profile-menu-status relative block h-[0.95rem] text-[0.76rem] whitespace-nowrap text-muted-foreground [clip-path:inset(0_-0.5rem)]"
              aria-hidden="true"
            >
              {profileStatuses.map((status, index) => (
                <span
                  key={status.kind}
                  className="profile-menu-status-item absolute inset-0 flex items-center gap-1 opacity-0 motion-reduce:animate-none data-[state=current]:animate-status-enter data-[state=current]:opacity-100 data-[state=previous]:animate-status-exit"
                  data-status-item
                  data-state={
                    index === statusIndex
                      ? "current"
                      : index === previousStatusIndex
                        ? "previous"
                        : "inactive"
                  }
                >
                  {status.kind === "availability" && (
                    <span className="availability-light relative size-1.5 shrink-0 blur-[1px] *:absolute *:inset-0 *:rounded-full *:bg-[#4ade80] mr-0.5">
                      <span />
                      <span className="animate-availability-ping motion-reduce:animate-none" />
                    </span>
                  )}
                  {status.kind === "email" && (
                    <Envelope className="profile-status-icon size-[0.78rem] shrink-0" />
                  )}
                  <span className="min-w-0 truncate">{status.label}</span>
                </span>
              ))}
            </span>
            <span className="sr-only">Software Engineer</span>
          </span>
        </span>
        <Kbd className="profile-shortcut mr-[0.35rem] h-auto gap-[0.14rem] rounded-lg border-0 bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] px-[0.42rem] py-[0.3rem] font-[inherit] text-[0.72rem] text-muted-foreground max-sm:hidden">
          <span className="text-[0.8rem] leading-none">⌘</span>K
        </Kbd>
        <Menu
          className="profile-menu-mobile-icon mr-[0.45rem] hidden size-[1.2rem] text-muted-foreground max-sm:block"
          aria-hidden="true"
        />
      </Button>

      <div
        className="grid transition-[grid-template-rows] duration-panel ease-out motion-reduce:transition-none data-[open=true]:grid-rows-[1fr] data-[open=false]:grid-rows-[0fr]"
        data-open={open}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            ref={panelRef}
            id="profile-menu-panel"
            className="profile-menu-panel relative px-[0.45rem] pb-[0.55rem] transition-opacity duration-panel ease-out motion-reduce:transition-none data-[open=true]:opacity-100 data-[open=true]:delay-100 data-[open=false]:opacity-0 data-[open=false]:delay-0"
            data-open={open}
            inert={!open ? true : undefined}
            aria-hidden={!open}
          >
            <div className="menu-group pt-[0.45rem]">
              <Separator className="mb-[0.45rem] bg-border" />
              <p className="menu-label m-0 px-[0.65rem] pt-[0.35rem] pb-[0.25rem] text-[0.72rem] text-muted-foreground">
                Sections
              </p>
              <nav
                className="grid gap-[0.1rem]"
                aria-label="Portfolio sections"
                onKeyDown={handlePanelKeyDown}
              >
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="menu-item flex min-h-[2.45rem] items-center gap-[0.65rem] rounded-xl px-[0.65rem] py-[0.45rem] text-[0.86rem] transition-colors duration-instant hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)]"
                      data-menu-item
                      tabIndex={open ? 0 : -1}
                      onClick={() => closeMenu()}
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </nav>
            </div>

            <div className="menu-group mt-[0.45rem] pt-[0.45rem]">
              <Separator className="mb-[0.45rem] bg-border" />
              <p
                className="menu-label m-0 px-[0.65rem] pt-[0.35rem] pb-[0.25rem] text-[0.72rem] text-muted-foreground"
                id="theme-label"
              >
                Theme
              </p>
              <div
                className="theme-options grid grid-cols-3 gap-[0.35rem]"
                role="radiogroup"
                aria-labelledby="theme-label"
                onKeyDown={handlePanelKeyDown}
              >
                {themes.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className="theme-option relative flex min-h-[2.65rem] items-center justify-center gap-[0.4rem] rounded-xl border border-transparent bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] text-[0.78rem] transition-[border-color,background-color] duration-instant hover:bg-[color-mix(in_srgb,var(--color-foreground)_8%,transparent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus data-[active=true]:border-border-strong data-[active=true]:bg-surface"
                      data-active={theme === option.value}
                    >
                      <input
                        type="radio"
                        name="portfolio-theme"
                        value={option.value}
                        checked={theme === option.value}
                        className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                        data-menu-item
                        tabIndex={open ? 0 : -1}
                        onChange={() => setTheme(option.value)}
                      />
                      <Icon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extends the hover hit area so the menu stays open while moving the pointer. */}
      <div
        className="pointer-events-none absolute top-0 -right-12 -bottom-16 -left-12 -z-10 max-sm:hidden data-[open=true]:pointer-events-auto"
        data-open={open}
        aria-hidden="true"
      />
    </div>
  );
}
