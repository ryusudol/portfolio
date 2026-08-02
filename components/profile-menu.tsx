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
  { href: "/#credentials", label: "Credentials", icon: GraduationCap },
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
      className="profile-menu"
      data-open={open}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        className="profile-menu-trigger"
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
        <span className="profile-avatar-frame">
          <Image
            src="/images/portrait/suhyeon-mountain-profile.png"
            alt="Suhyeon Yu"
            width={160}
            height={160}
            className="profile-avatar"
            priority
          />
        </span>
        <span className="profile-menu-copy">
          <strong>Suhyeon Yu</strong>
          <span className="profile-menu-status" aria-hidden="true">
            {profileStatuses.map((status, index) => (
              <span
                key={status.kind}
                className="profile-menu-status-item"
                data-state={
                  index === statusIndex
                    ? "current"
                    : index === previousStatusIndex
                      ? "previous"
                      : "inactive"
                }
              >
                {status.kind === "availability" ? (
                  <span className="availability-light" />
                ) : null}
                {status.kind === "email" ? (
                  <Envelope className="profile-status-icon" />
                ) : null}
                {status.label}
              </span>
            ))}
          </span>
          <span className="sr-only">Software Engineer</span>
        </span>
        <kbd className="profile-shortcut">
          <span>⌘</span>K
        </kbd>
        <Menu className="profile-menu-mobile-icon" aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="profile-menu-panel"
          className="profile-menu-panel"
        >
          <div className="menu-group">
            <p className="menu-label">Sections</p>
            <nav aria-label="Portfolio sections" onKeyDown={handlePanelKeyDown}>
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="menu-item"
                    data-menu-item
                    onClick={() => closeMenu()}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>

          <div className="menu-group">
            <p className="menu-label" id="theme-label">
              Theme
            </p>
            <div
              className="theme-options"
              role="radiogroup"
              aria-labelledby="theme-label"
              onKeyDown={handlePanelKeyDown}
            >
              {themes.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className="theme-option"
                    data-active={theme === option.value}
                  >
                    <input
                      type="radio"
                      name="portfolio-theme"
                      value={option.value}
                      checked={theme === option.value}
                      data-menu-item
                      onChange={() => setTheme(option.value)}
                    />
                    <Icon aria-hidden="true" />
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
