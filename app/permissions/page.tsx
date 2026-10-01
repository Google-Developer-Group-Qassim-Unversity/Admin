"use client";

import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { GrantsPanel } from "@/components/permissions/grants-panel";
import { LeadersPanel } from "@/components/permissions/leaders-panel";
import { SuperAdminsPanel } from "@/components/permissions/super-admins-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccess } from "@/hooks/use-access";

/**
 * Who can do what. Leaders and VPs grant their members; super admins also set
 * what leaders and VPs get (shared, plus each department's extras) and the
 * super-admin list.
 */
export default function PermissionsPage() {
  const t = useTranslations("permissions");
  const { can, isSuperAdmin } = useAccess();
  const manage = can("permissions.manage");

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={KeyRound} />
      <Tabs defaultValue="grants">
        <TabsList>
          <TabsTrigger value="grants">{t("tabs.grants")}</TabsTrigger>
          {manage ? <TabsTrigger value="leaders">{t("tabs.leaders")}</TabsTrigger> : null}
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
          <TabsContent value="super-admins" className="mt-4">
            <SuperAdminsPanel />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
