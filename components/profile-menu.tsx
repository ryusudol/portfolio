"use client";

import Image from "next/image";
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
  Star,
  Sun,
} from "reicon-react";

import { type ThemePreference, useTheme } from "@/components/theme-provider";

const navigation = [
  { href: "/#home", label: "Home", icon: Home },
  { href: "/#experience", label: "Experience", icon: Briefcase },
  { href: "/#work", label: "Selected work", icon: Star },
  { href: "/#background", label: "Background", icon: GraduationCap },
  { href: "/#stack", label: "Tech stack", icon: Code },
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
    };
  }, [closeMenu, focusMenuItem]);

  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && !open) {
      hoverOpenedRef.current = true;
      setOpen(true);
    }
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") {
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
      className="profile-menu fixed top-12 left-1/2 z-50 w-[min(20rem,calc(100vw-2rem))] max-[420px]:w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-[1.75rem] border border-border bg-[color-mix(in_srgb,var(--color-surface)_91%,transparent)] shadow-[0_8px_28px_rgb(62_54_47/8%)] backdrop-blur-[18px] backdrop-saturate-150 transition-[width,border-radius,box-shadow] duration-[280ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] animate-profile-enter motion-reduce:animate-none motion-reduce:transition-none max-sm:top-4 dark:shadow-[0_12px_34px_rgb(0_0_0/24%)] data-[open=true]:w-[min(25rem,calc(100vw-2rem))] data-[open=true]:max-[420px]:w-[calc(100vw-2rem)] data-[open=true]:rounded-3xl data-[open=true]:shadow-portfolio"
      data-open={open}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        className="profile-menu-trigger flex min-h-[3.45rem] w-full items-center gap-[0.7rem] border-0 bg-transparent p-[0.4rem] text-left"
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
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="flex min-w-0 flex-1 items-center">
          <span className="profile-avatar-frame relative size-[2.65rem] shrink-0 overflow-hidden rounded-full">
            <Image
              src="/images/portrait/suhyeon-mountain-profile.png"
              alt="Suhyeon Yu's profile image"
              width={160}
              height={160}
              className="profile-avatar size-full object-cover"
              priority
            />
          </span>
          <span className="profile-menu-copy ml-[0.6rem] flex min-w-0 flex-1 flex-col leading-[1.25]">
            <span className="truncate text-[0.94rem]">Suhyeon Yu</span>
            <span
              className="profile-menu-status relative block h-[0.95rem] text-[0.76rem] whitespace-nowrap text-muted [clip-path:inset(0_-0.5rem)]"
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
                  {status.kind === "availability" ? (
                    <span className="availability-light relative size-1.5 shrink-0 blur-[1px] *:absolute *:inset-0 *:rounded-full *:bg-[#4ade80]">
                      <span />
                      <span className="animate-availability-ping motion-reduce:animate-none" />
                    </span>
                  ) : null}
                  {status.kind === "email" ? (
                    <Envelope className="profile-status-icon size-[0.78rem] shrink-0" />
                  ) : null}
                  <span className="min-w-0 truncate">{status.label}</span>
                </span>
              ))}
            </span>
            <span className="sr-only">Software Engineer</span>
          </span>
        </span>
        <kbd className="profile-shortcut mr-[0.35rem] flex items-center gap-[0.14rem] rounded-lg border-0 bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] px-[0.42rem] py-[0.3rem] font-[inherit] text-[0.72rem] text-muted max-sm:hidden">
          <span className="text-[0.8rem] leading-none">⌘</span>K
        </kbd>
        <Menu
          className="profile-menu-mobile-icon mr-[0.45rem] hidden size-[1.2rem] text-muted max-sm:block"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="profile-menu-panel"
          className="profile-menu-panel animate-panel-enter px-[0.45rem] pb-[0.55rem] motion-reduce:animate-none"
        >
          <div className="menu-group border-t border-border pt-[0.45rem]">
            <p className="menu-label m-0 px-[0.65rem] pt-[0.35rem] pb-[0.25rem] text-[0.72rem] text-muted">
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
                    className="menu-item flex min-h-[2.45rem] items-center gap-[0.65rem] rounded-xl px-[0.65rem] py-[0.45rem] text-[0.86rem] transition-colors duration-[140ms] hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)]"
                    data-menu-item
                    onClick={() => closeMenu()}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted"
                    />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="menu-group mt-[0.45rem] border-t border-border pt-[0.45rem]">
            <p
              className="menu-label m-0 px-[0.65rem] pt-[0.35rem] pb-[0.25rem] text-[0.72rem] text-muted"
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
                    className="theme-option relative flex min-h-[2.65rem] items-center justify-center gap-[0.4rem] rounded-xl border border-transparent bg-[color-mix(in_srgb,var(--color-foreground)_4%,transparent)] text-[0.78rem] transition-[border-color,background-color] duration-[140ms] hover:bg-[color-mix(in_srgb,var(--color-foreground)_8%,transparent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus data-[active=true]:border-border-strong data-[active=true]:bg-surface"
                    data-active={theme === option.value}
                  >
                    <input
                      type="radio"
                      name="portfolio-theme"
                      value={option.value}
                      checked={theme === option.value}
                      className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
                      data-menu-item
                      onChange={() => setTheme(option.value)}
                    />
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
