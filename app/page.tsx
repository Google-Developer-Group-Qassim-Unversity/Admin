import { CalendarPlus, Trophy, ShieldCheck, Award, Mail } from "lucide-react";

import { ModuleCard } from "@/components/module-card";

const modules = [
  {
    icon: CalendarPlus,
    title: "Manage Events",
    description: "Create and manage events for participants to join and compete",
    href: "/events",
    buttonText: "Manage Events",
  },
  {
    icon: Trophy,
    title: "Manage Points",
    description: "Create and manage custom point events for departments",
    href: "/points",
    buttonText: "Manage Points",
  },
  {
    icon: Mail,
    title: "Manage Emails",
    description: "Monitor email logs, usage stats, and manage email assets",
    href: "/manage-emails",
    buttonText: "Manage Emails",
  },
  {
    icon: ShieldCheck,
    title: "Manage Admins",
    description: "Add, view, and manage administrator roles and permissions",
    href: "/manage-admins",
    buttonText: "Manage Admins",
  }
];

export default function Page() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage events, participants, and scores
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard key={module.href} {...module} />
        ))}
      </div>
    </div>
  );
}
