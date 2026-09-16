"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  LayoutDashboard,
  Mail,
  Menu,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { AppBackground, BrandMark } from "@/components/brand-mark";
import { CommandPalette } from "@/components/command-palette";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getDirection, type Locale } from "@/i18n/config";

/** Routes that render bare - the QR projector screen and the access wall. */
const MINIMAL_ROUTES = ["/qr-display", "/access-denied"];

type NavItem = { href: string; key: string; icon: LucideIcon };
type NavGroup = { key: string; items: NavItem[] };

/**
 * Grouped by what an admin is trying to do, not by which table the data lives
 * in. "Dashboard" and "Events" are the same job; "Members" and "Admins" are
 * both people; points and email are both outbound.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "operate",
    items: [
      { href: "/", key: "home", icon: LayoutDashboard },
      { href: "/events", key: "events", icon: CalendarDays },
    ],
  },
  {
    key: "people",
    items: [
      { href: "/manage-members", key: "members", icon: Users },
      { href: "/club-structure", key: "clubStructure", icon: Network },
      { href: "/manage-admins", key: "admins", icon: ShieldCheck },
    ],
  },
  {
    key: "engage",
    items: [
      { href: "/points", key: "points", icon: Trophy },
      { href: "/manage-emails", key: "emails", icon: Mail },
    ],
  },
  {
    key: "system",
    items: [{ href: "/settings", key: "settings", icon: Settings }],
  },
];

/** "/" only matches itself; every other entry owns its subtree. */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          <div className="text-muted-foreground/70 px-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase">
            {t(`groups.${group.key}`)}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" />
                <span className="flex-1">{t(item.key)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Sidebar() {
  const t = useTranslations("nav");

  return (
    <aside className="bg-sidebar border-border hidden w-60 shrink-0 flex-col border-e md:flex">
      <div className="border-border flex h-14 items-center gap-2.5 border-b px-4">
        <BrandMark size={26} />
        <div className="flex min-w-0 flex-col">
          <span className="font-display text-[13.5px] leading-tight font-bold tracking-tight">
            GDG Qassim
          </span>
          <span className="text-muted-foreground text-[10.5px] leading-tight">
            {t("consoleLabel")}
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <NavLinks />
      </nav>
    </aside>
  );
}

function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("nav");
  // Radix's Sheet `side` is physical, so the drawer has to be told which
  // edge is the leading one - it always opens from the hamburger's side.
  const side = getDirection(useLocale() as Locale) === "rtl" ? "right" : "left";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t("toggleMenu")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="w-[280px] p-0 sm:w-[300px]">
        <SheetHeader className="border-border border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span className="font-display text-[15px] font-bold tracking-tight">GDG Qassim</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="p-3">
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const current = NAV_GROUPS.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));

  return (
    <header className="bg-card border-border sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <MobileNav />

      <h2 className="font-display truncate text-[15px] font-bold tracking-tight">
        {current ? t(current.key) : "GDG Qassim"}
      </h2>

      <button
        type="button"
        onClick={onOpenSearch}
        className="bg-background border-border text-muted-foreground hover:bg-muted mx-auto hidden h-9 w-full max-w-md items-center gap-2.5 rounded-lg border px-3 text-start text-[13px] transition-colors lg:flex"
      >
        <Search className="h-[15px] w-[15px] shrink-0" />
        <span className="flex-1 truncate">{t("searchPlaceholder")}</span>
        <kbd className="bg-card border-border text-muted-foreground tabular rounded border px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="ms-auto flex items-center gap-1.5 lg:ms-0">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSearch}>
          <Search className="h-[18px] w-[18px]" />
          <span className="sr-only">{t("searchPlaceholder")}</span>
        </Button>
        <LanguageToggle />
        <ThemeToggle />
        <AuthButton />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);

  const minimal = MINIMAL_ROUTES.includes(pathname);

  // Bound before the early return so the hook order never changes between the
  // projector route and the rest of the app.
  React.useEffect(() => {
    if (minimal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [minimal]);

  if (minimal) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppBackground />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenSearch={() => setSearchOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
