"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ListChecks, Mail, MailPlus, Megaphone, Send } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { useTranslations } from "next-intl";

import { EmailLogsTab } from "./email-logs-tab";
import { EmailJobsTab } from "./email-jobs-tab";
import { UsagePanel } from "./usage-panel";
import { AssetsPanel } from "./assets-panel";
import { SendCertificatesTab } from "./send-certificates-tab";
import { DirectEmailTab } from "./direct-email-tab";
import { BlastEmailsTab } from "./blast-emails-tab";

const TABS = ["logs", "certificates", "direct", "blast", "jobs"] as const;
type Tab = (typeof TABS)[number];

export default function ManageEmailsPage() {
  const t = useTranslations("manageEmails");
  const searchParams = useSearchParams();
  // ?tab= opens a tab directly (links from elsewhere, a reload keeps your place).
  const initial = searchParams.get("tab");
  const [activeTab, setActiveTabState] = React.useState<Tab>(
    TABS.includes(initial as Tab) ? (initial as Tab) : "logs",
  );
  const setActiveTab = React.useCallback((tab: string) => {
    setActiveTabState(tab as Tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  }, []);
  const goToLogs = React.useCallback(() => setActiveTab("logs"), [setActiveTab]);

  const ICONS: Record<Tab, typeof Mail> = { logs: Mail, certificates: Send, direct: MailPlus, blast: Megaphone, jobs: ListChecks };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Mail} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
            {/* Five tabs do not fit a phone: the strip scrolls sideways and
                sticks under the top bar so switching never needs a scroll
                back up. */}
            <div className="bg-background border-rule sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-20 -mx-4 -mt-2 border-b px-2 sm:static sm:mx-0 sm:mt-0 sm:bg-transparent sm:px-0">
              <TabsList
                variant="line"
                className="no-scrollbar h-auto! w-full justify-start gap-1 overflow-x-auto overscroll-x-contain p-0"
              >
                {TABS.map((tab) => {
                  const Icon = ICONS[tab];
                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="min-h-12 flex-none px-3 after:-bottom-px! after:h-[3px]! after:rounded-t-[2px]"
                    >
                      <Icon className="size-[18px]" strokeWidth={1.75} />
                      {t(`tabs.${tab}`)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            <TabsContent value="logs" className="mt-4">
              <EmailLogsTab />
            </TabsContent>
            <TabsContent value="certificates" className="mt-4">
              <SendCertificatesTab onGoToLogs={goToLogs} />
            </TabsContent>
            <TabsContent value="direct" className="mt-4">
              <DirectEmailTab onGoToLogs={goToLogs} />
            </TabsContent>
            <TabsContent value="blast" className="mt-4">
              <BlastEmailsTab onGoToLogs={goToLogs} />
            </TabsContent>
            <TabsContent value="jobs" className="mt-4">
              <EmailJobsTab />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="flex flex-col gap-4">
          <UsagePanel />
          <AssetsPanel />
        </aside>
      </div>
    </div>
  );
}
