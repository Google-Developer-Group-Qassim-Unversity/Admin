"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { Home, CalendarPlus, ShieldCheck, Trophy, Users, Menu, Settings } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { getDirection, type Locale } from "@/i18n/config";
import { AuthButton } from "@/components/auth-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "/", key: "home", icon: Home },
  { href: "/events", key: "events", icon: CalendarPlus },
  { href: "/points", key: "points", icon: Trophy },
  { href: "/manage-members", key: "members", icon: Users },
  { href: "/manage-admins", key: "admins", icon: ShieldCheck },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  // Radix's Sheet `side` is physical, so the drawer has to be told which
  // edge is the trailing one - it always opens from the hamburger's side.
  const side = getDirection(useLocale() as Locale) === "rtl" ? "left" : "right";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/gdg.png" alt="Logo" width={362} height={200} className="h-5 w-9" priority unoptimized />
          <span className="hidden sm:inline-block">GDG Score Tracker Admin</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                <span>{t(link.key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side - Theme toggle and User profile */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <AuthButton />
          </div>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("toggleMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side={side} className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle>{t("menu")}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent rounded-md"
                    >
                      <Icon className="h-5 w-5" />
                      <span>{t(link.key)}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="flex items-center gap-2 mt-6 pt-6 border-t">
                <LanguageToggle />
                <ThemeToggle />
                <AuthButton />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
