import { CalendarPlus, Trophy, ShieldCheck, Mail, Users, Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ModuleCard } from "@/components/module-card";

const modules = [
  { key: "events", icon: CalendarPlus, href: "/events" },
  { key: "points", icon: Trophy, href: "/points" },
  { key: "members", icon: Users, href: "/manage-members" },
  { key: "emails", icon: Mail, href: "/manage-emails" },
  { key: "admins", icon: ShieldCheck, href: "/manage-admins" },
  { key: "settings", icon: Settings, href: "/settings" },
] as const;

export default async function Page() {
  const t = await getTranslations("home");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard
            key={module.href}
            icon={module.icon}
            href={module.href}
            title={t(`${module.key}.title`)}
            description={t(`${module.key}.description`)}
            buttonText={t(`${module.key}.button`)}
          />
        ))}
      </div>
    </div>
  );
}
