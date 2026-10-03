"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { GrantsPanel } from "@/components/permissions/grants-panel";
import { LeadersPanel } from "@/components/permissions/leaders-panel";
import { MemberAccessPanel } from "@/components/permissions/member-access-panel";
import { SuperAdminsPanel } from "@/components/permissions/super-admins-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccess } from "@/hooks/use-access";

/**
 * Who can do what. Leaders and VPs grant their members; super admins also set
 * what leaders and VPs get (shared, plus each department's extras), look up
 * any member's access, and keep the super-admin list.
 *
 * The tab and the looked-up member live in the URL (`?tab=member&member=12`),
 * so the member card can link straight to someone's access.
 */
export default function PermissionsPage() {
  const t = useTranslations("permissions");
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={KeyRound} />
      {/* useSearchParams needs a Suspense boundary for the static build. */}
      <Suspense fallback={<Skeleton className="h-60 w-full" />}>
        <PermissionsTabs />
      </Suspense>
    </div>
  );
}

function PermissionsTabs() {
  const t = useTranslations("permissions");
  const { can, isSuperAdmin } = useAccess();
  const manage = can("permissions.manage");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const tabs = ["grants", ...(manage ? ["leaders"] : []), ...(isSuperAdmin ? ["member", "super-admins"] : [])];
  const requested = params.get("tab");
  const tab = requested && tabs.includes(requested) ? requested : "grants";
  const memberParam = Number(params.get("member"));
  const memberId = Number.isInteger(memberParam) && memberParam > 0 ? memberParam : null;

  const navigate = (next: { tab?: string; member?: number | null }) => {
    const query = new URLSearchParams(params.toString());
    if (next.tab !== undefined) query.set("tab", next.tab);
    if (next.member !== undefined) {
      if (next.member === null) query.delete("member");
      else query.set("member", String(next.member));
    }
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={tab} onValueChange={(value) => navigate({ tab: value })}>
      <TabsList>
        <TabsTrigger value="grants">{t("tabs.grants")}</TabsTrigger>
        {manage ? <TabsTrigger value="leaders">{t("tabs.leaders")}</TabsTrigger> : null}
        {isSuperAdmin ? <TabsTrigger value="member">{t("tabs.member")}</TabsTrigger> : null}
        {isSuperAdmin ? <TabsTrigger value="super-admins">{t("tabs.superAdmins")}</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="grants" className="mt-4">
        <GrantsPanel />
      </TabsContent>
      {manage ? (
        <TabsContent value="leaders" className="mt-4">
          <LeadersPanel />
        </TabsContent>
      ) : null}
      {isSuperAdmin ? (
        <TabsContent value="member" className="mt-4">
          <MemberAccessPanel memberId={memberId} onMemberChange={(member) => navigate({ tab: "member", member })} />
        </TabsContent>
      ) : null}
      {isSuperAdmin ? (
        <TabsContent value="super-admins" className="mt-4">
          <SuperAdminsPanel />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
