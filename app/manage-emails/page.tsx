"use client";

import * as React from "react";
import { ListChecks, Mail, MailPlus, Megaphone, Send } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

import { EmailLogsTab } from "./email-logs-tab";
import { EmailJobsTab } from "./email-jobs-tab";
import { UsagePanel } from "./usage-panel";
import { AssetsPanel } from "./assets-panel";
import { SendCertificatesTab } from "./send-certificates-tab";
import { DirectEmailTab } from "./direct-email-tab";
import { BlastEmailsTab } from "./blast-emails-tab";

export default function ManageEmailsPage() {
  const [activeTab, setActiveTab] = React.useState("logs");
  const t = useTranslations("manageEmails");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="logs">
                <Mail className="h-4 w-4" />
                {t("tabs.logs")}
              </TabsTrigger>
              <TabsTrigger value="certificates">
                <Send className="h-4 w-4" />
                {t("tabs.certificates")}
              </TabsTrigger>
              <TabsTrigger value="direct">
                <MailPlus className="h-4 w-4" />
                {t("tabs.direct")}
              </TabsTrigger>
              <TabsTrigger value="blast">
                <Megaphone className="h-4 w-4" />
                {t("tabs.blast")}
              </TabsTrigger>
              <TabsTrigger value="jobs">
                <ListChecks className="h-4 w-4" />
                {t("tabs.jobs")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="logs" className="mt-4">
              <EmailLogsTab />
            </TabsContent>
            <TabsContent value="certificates" className="mt-4">
              <SendCertificatesTab onGoToLogs={() => setActiveTab("logs")} />
            </TabsContent>
            <TabsContent value="direct" className="mt-4">
              <DirectEmailTab onGoToLogs={() => setActiveTab("logs")} />
            </TabsContent>
            <TabsContent value="blast" className="mt-4">
              <BlastEmailsTab onGoToLogs={() => setActiveTab("logs")} />
            </TabsContent>
            <TabsContent value="jobs" className="mt-4">
              <EmailJobsTab />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <UsagePanel />
          <AssetsPanel />
        </div>
      </div>
    </div>
  );
}
