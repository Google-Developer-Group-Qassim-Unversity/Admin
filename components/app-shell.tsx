"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  Network,
  Search,
  Settings,
  Workflow,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { AppBackground, BrandMark } from "@/components/brand-mark";
import { CommandPalette } from "@/components/command-palette";
import { LanguageSegmented, LanguageToggle } from "@/components/language-toggle";
import { NotificationBell } from "@/components/pipeline/notification-bell";
import { ThemeSegmented, ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AccessDenied } from "@/components/ui/access-denied";
import { useAccess } from "@/hooks/use-access";

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
      { href: "/pipeline", key: "pipeline", icon: Workflow },
    ],
  },
  {
    key: "people",
    items: [
      { href: "/manage-members", key: "members", icon: Users },
      { href: "/club-structure", key: "clubStructure", icon: Network },
      { href: "/permissions", key: "permissions", icon: KeyRound },
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

/** The nav, less what the signed-in person cannot open (nothing, until their access has loaded). */
export function useNavGroups(): NavGroup[] {
  const { canOpen, access } = useAccess();
  return React.useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canOpen(i.href)) })).filter(
        (g) => g.items.length > 0,
      ),
    // canOpen changes identity every render; access is what it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [access],
  );
}

/** "/" only matches itself; every other entry owns its subtree. */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const groups = useNavGroups();

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
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

/**
 * The phone layout's navigation: a bottom bar in thumb reach instead of a
 * drawer behind a hamburger. It holds the first four destinations this admin
 * can open; everything else, plus theme and language, lives in "More".
 */
const MOBILE_PRIORITY = [
  "/",
  "/events",
  "/pipeline",
  "/points",
  "/manage-members",
  "/club-structure",
  "/manage-emails",
];
const MOBILE_SLOTS = 4;

function useMobileNav() {
  const allowed = useNavGroups().flatMap((g) => g.items);
  const primary = MOBILE_PRIORITY.map((href) => allowed.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i))
    .slice(0, MOBILE_SLOTS);
  const overflow = allowed.filter((i) => !primary.includes(i));
  return { primary, overflow };
}

function TabLink({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <>
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
          active ? "bg-brand-blue-soft text-brand-blue-ink" : "text-muted-foreground"
        }`}
      >
        <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.25 : 1.9} />
      </span>
      <span
        className={`max-w-full truncate px-1 text-[11px] leading-none ${
          active ? "text-foreground font-semibold" : "text-muted-foreground font-medium"
        }`}
      >
        {label}
      </span>
    </>
  );
}

const TAB_CLASS =
  "flex h-full min-w-0 flex-col items-center justify-center gap-1 outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-muted active:opacity-70";

function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { primary, overflow } = useMobileNav();
  const overflowActive = overflow.some((item) => isActive(pathname, item.href));

  return (
    <nav
      aria-label={t("menu")}
      className="bg-card/95 border-border supports-backdrop-filter:bg-card/85 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] supports-backdrop-filter:backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={TAB_CLASS}
              >
                <TabLink icon={item.icon} label={t(item.key)} active={active} />
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button type="button" className={`${TAB_CLASS} w-full`}>
                <TabLink icon={LayoutGrid} label={t("more")} active={overflowActive || moreOpen} />
              </button>
            </SheetTrigger>
            <MoreSheet items={overflow} onNavigate={() => setMoreOpen(false)} />
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}

function MoreSheet({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();

  return (
    <SheetContent
      side="bottom"
      closeLabel={tc("actions.close")}
      className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-3xl border-t-0 p-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <div aria-hidden="true" className="bg-border mx-auto mt-2.5 h-1 w-10 rounded-full" />
      <SheetHeader className="px-5 pt-3 pb-4">
        <SheetTitle className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="flex flex-col">
            <span className="font-display text-base leading-tight font-bold tracking-tight">
              GDG Qassim
            </span>
            <span className="text-muted-foreground text-xs leading-tight font-normal">
              {t("consoleLabel")}
            </span>
          </span>
        </SheetTitle>
        <SheetDescription className="sr-only">{t("more")}</SheetDescription>
      </SheetHeader>

      {items.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 px-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm transition-colors active:scale-[0.98] ${
                    active
                      ? "border-brand-blue/40 bg-brand-blue-soft text-brand-blue-ink font-semibold"
                      : "border-border bg-card hover:bg-muted font-medium"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 leading-tight">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 border-t px-4 pt-5">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground px-1 text-xs font-semibold">
            {t("appearance")}
          </span>
          <ThemeSegmented />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground px-1 text-xs font-semibold">
            {tc("language")}
          </span>
          <LanguageSegmented />
        </div>
      </div>
    </SheetContent>
  );
}

function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const current = NAV_GROUPS.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));

  return (
    <header className="bg-card/95 border-border supports-backdrop-filter:bg-card/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b ps-4 pe-2 pt-[env(safe-area-inset-top)] supports-backdrop-filter:backdrop-blur-lg sm:px-6 md:bg-card md:backdrop-blur-none">
      <Link href="/" className="-ms-1 flex shrink-0 rounded-lg p-1 md:hidden" aria-label="GDG Qassim">
        <BrandMark size={24} />
      </Link>

      <h2 className="font-display truncate text-[17px] font-bold tracking-tight md:text-[15px]">
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

      <div className="ms-auto flex items-center gap-1 lg:ms-0">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSearch}>
          <Search className="h-5 w-5" />
          <span className="sr-only">{t("searchPlaceholder")}</span>
        </Button>
        <div className="hidden items-center gap-1 md:flex">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <NotificationBell />
        <div className="flex h-10 w-10 items-center justify-center">
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

/**
 * Each page's own permission (see `routeNeeds` in lib/access.ts). The
 * middleware only lets staff in; this stops a staff member at a page they
 * cannot use, and the backend refuses the calls anyway.
 */
function PageAccess({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const t = useTranslations("accessDenied");
  const { access, isLoading, canOpen } = useAccess();
  if (isLoading && !access) return null;
  if (!canOpen(pathname)) {
    return <AccessDenied title={t("noPermission.title")} description={t("noPermission.description")} />;
  }
  return <>{children}</>;
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
          <main className="flex-1 px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-6 lg:px-8">
            <PageAccess pathname={pathname}>{children}</PageAccess>
          </main>
        </div>
      </div>
      <BottomNav />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
