"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  Network,
  Search,
  Settings,
  Route,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { GdgLogo } from "@/components/brand-mark";
import { Count, Plate, Shurfa } from "@/components/najdi";
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
import { useInbox, usePipelineMe } from "@/hooks/use-pipeline";

/** Routes that render bare - the QR projector screen, the access wall and sign-in. */
const MINIMAL_ROUTES = ["/qr-display", "/access-denied", "/sign-in"];

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
      { href: "/pipeline", key: "pipeline", icon: Route },
      { href: "/events", key: "events", icon: CalendarDays },
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
  const waiting = useWaitingOnYou();

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          <span className="text-ink-3 px-3 pb-1 text-xs font-bold">{t(`groups.${group.key}`)}</span>
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
                className={`flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-[14.5px] transition-colors ${
                  active
                    ? "bg-foreground text-background font-bold"
                    : "text-ink-2 hover:bg-sunk hover:text-foreground font-medium"
                }`}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{t(item.key)}</span>
                {item.href === "/pipeline" && waiting > 0 ? <Count tone="ochre">{waiting}</Count> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * How many pipeline tasks are waiting on the signed-in person's teams. Shown
 * as a count on the Pipeline entry; zero (and no request) for anyone without
 * pipeline access or a team.
 */
function useWaitingOnYou() {
  const { canOpen, access } = useAccess();
  const allowed = Boolean(access) && canOpen("/pipeline");
  const me = usePipelineMe({ enabled: allowed });
  const hasTeam = Boolean(me.data?.is_super_admin || me.data?.departments.some((d) => d.teams.length > 0));
  const inbox = useInbox(allowed && hasTeam);
  return allowed ? new Set(inbox.data?.map((item) => item.request.id)).size : 0;
}

/** The ochre door that starts every event: the booking calendar, in booking mode. */
const BOOK_HREF = "/pipeline?book=1";

function BrandBlock({ size = "md" }: { size?: "md" | "lg" }) {
  const t = useTranslations("nav");
  return (
    <div className="flex min-w-0 items-center gap-3">
      <GdgLogo height={size === "lg" ? 26 : 22} priority />
      <div className="flex min-w-0 flex-col">
        <span className="font-display truncate text-[19px] leading-tight font-semibold">{t("brand")}</span>
        <span className="text-ink-2 truncate text-[12.5px] leading-tight">{t("consoleLabel")}</span>
      </div>
    </div>
  );
}

function Sidebar() {
  const tb = useTranslations("pipeline.book");
  const { canOpen, access } = useAccess();
  const canBook = Boolean(access) && canOpen("/pipeline");

  return (
    <aside className="bg-sidebar border-rule sticky top-0 hidden h-svh max-h-svh w-64 shrink-0 self-start flex-col gap-4 border-e px-4 pt-5 pb-4 md:flex">
      <div className="px-2">
        <BrandBlock size="lg" />
      </div>
      <nav className="-mx-1 flex-1 overflow-y-auto px-1">
        <NavLinks />
      </nav>
      {canBook ? (
        <Button asChild variant="ochre" size="lg" className="w-full">
          <Link href={BOOK_HREF} prefetch>
            <CalendarPlus />
            {tb("start")}
          </Link>
        </Button>
      ) : null}
    </aside>
  );
}

/**
 * The phone layout's navigation: a bottom bar in thumb reach. Home, the
 * pipeline and events on either side of the ochre Book door; everything else,
 * plus theme and language, lives in "More".
 */
const MOBILE_PRIORITY = ["/", "/pipeline", "/events", "/manage-members", "/points", "/club-structure", "/manage-emails"];

function useMobileNav(slots: number) {
  const allowed = useNavGroups().flatMap((g) => g.items);
  const primary = MOBILE_PRIORITY.map((href) => allowed.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i))
    .slice(0, slots);
  const overflow = allowed.filter((i) => !primary.includes(i));
  return { primary, overflow };
}

function TabLink({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      {active ? <span aria-hidden="true" className="bg-foreground absolute top-0 h-[3px] w-7 rounded-b-[2px]" /> : null}
      <Icon className="size-[21px]" strokeWidth={active ? 2.1 : 1.75} />
      <span
        className={`max-w-full truncate px-1 text-[11.5px] leading-none ${active ? "text-foreground font-bold" : "font-medium"}`}
      >
        {label}
      </span>
    </>
  );
}

const TAB_CLASS =
  "relative flex h-full min-w-0 flex-col items-center justify-center gap-1 text-ink-2 outline-none select-none [-webkit-tap-highlight-color:transparent] hover:text-foreground focus-visible:bg-sunk active:opacity-70";

function BottomNav() {
  const t = useTranslations("nav");
  const tb = useTranslations("pipeline.book");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { canOpen, access } = useAccess();
  const canBook = Boolean(access) && canOpen("/pipeline");
  // With the Book door in the middle there is room for three destinations and More.
  const { primary, overflow } = useMobileNav(canBook ? 3 : 4);
  const overflowActive = overflow.some((item) => isActive(pathname, item.href));
  const tabs = primary.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <li key={item.href} className="min-w-0">
        <Link href={item.href} prefetch aria-current={active ? "page" : undefined} className={TAB_CLASS}>
          <TabLink icon={item.icon} label={item.key === "pipeline" ? t("pipelineShort") : t(item.key)} active={active} />
        </Link>
      </li>
    );
  });

  return (
    <nav
      aria-label={t("menu")}
      className="bg-card border-foreground fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {canBook ? (
          <>
            {tabs.slice(0, 2)}
            <li className="min-w-0">
              <Link
                href={BOOK_HREF}
                prefetch
                className="flex h-full flex-col items-center justify-end gap-1 pb-2 outline-none select-none focus-visible:[&>span:first-child]:outline-2 focus-visible:[&>span:first-child]:outline-offset-2 focus-visible:[&>span:first-child]:outline-ring active:[&>span:first-child]:translate-y-px"
              >
                <span className="plate-depth bg-door-ochre text-on-door-ochre -mt-5 grid h-[50px] w-14 place-items-center rounded-t-[6px] rounded-b-[3px] shadow-[0_6px_14px_-6px_rgb(140_94_8/0.7)]">
                  <CalendarPlus className="size-6" strokeWidth={1.9} />
                </span>
                <span className="text-foreground max-w-full truncate px-1 text-[11.5px] leading-none font-bold">
                  {tb("start")}
                </span>
              </Link>
            </li>
            {tabs.slice(2)}
          </>
        ) : (
          tabs
        )}
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
      className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-xl border-t-0 p-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <SheetHeader className="px-5 pt-3 pb-4">
        <SheetTitle>
          <BrandBlock />
        </SheetTitle>
        <SheetDescription className="sr-only">{t("more")}</SheetDescription>
      </SheetHeader>

      {items.length > 0 ? (
        <ul className="border-rule mx-4 flex flex-col border-t">
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
                  className={`border-rule flex min-h-14 items-center gap-3 border-b px-1 text-[15px] transition-colors active:bg-sunk ${
                    active ? "font-bold" : "font-medium"
                  }`}
                >
                  <Plate tone={active ? "ochre" : "umber"} icon={Icon} size="sm" />
                  <span className="min-w-0 flex-1 leading-tight">{t(item.key)}</span>
                  <ChevronRight className="text-ink-3 size-[18px] rtl:-scale-x-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-2">
          <span className="text-ink-2 px-1 text-xs font-bold">{t("appearance")}</span>
          <ThemeSegmented />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-ink-2 px-1 text-xs font-bold">{tc("language")}</span>
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
    <header className="sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top)]">
      <Shurfa className="h-3 md:h-3.5" />
      <div className="bg-card border-rule flex h-14 items-center gap-3 border-b ps-4 pe-2 sm:px-6 lg:px-8">
        <Link href="/" className="-ms-1 flex shrink-0 rounded-lg p-1 md:hidden" aria-label={t("brand")}>
          <GdgLogo height={22} priority />
        </Link>

        <h2 className="font-display truncate text-[19px] leading-tight font-semibold">
          {current ? t(current.key) : t("brand")}
        </h2>

        <button
          type="button"
          onClick={onOpenSearch}
          className="bg-background text-ink-2 hover:text-foreground mx-auto hidden h-10 w-full max-w-sm items-center gap-2.5 rounded-lg px-3 text-start text-sm shadow-[inset_0_0_0_1px_var(--rule)] transition-colors hover:shadow-[inset_0_0_0_1px_var(--adobe)] lg:flex"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">{t("searchPlaceholder")}</span>
          <kbd dir="ltr" className="tabular rounded-sm px-1.5 py-0.5 text-[11.5px] font-bold shadow-[inset_0_0_0_1px_var(--rule)]">
            ⌘K
          </kbd>
        </button>

        <div className="ms-auto flex items-center gap-1 lg:ms-0">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSearch}>
            <Search className="size-5" />
            <span className="sr-only">{t("searchPlaceholder")}</span>
          </Button>
          <div className="hidden items-center gap-1 md:flex">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <NotificationBell />
          <div className="flex size-11 items-center justify-center">
            <AuthButton />
          </div>
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

  const minimal = MINIMAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

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
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenSearch={() => setSearchOpen(true)} />
          <main className="flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-8 lg:px-8">
            <PageAccess pathname={pathname}>{children}</PageAccess>
          </main>
        </div>
      </div>
      <BottomNav />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
