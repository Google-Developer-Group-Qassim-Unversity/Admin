"use client";

import * as React from "react";
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

export default function ManageEmailsPage() {
  const [activeTab, setActiveTab] = React.useState("logs");
  const t = useTranslations("manageEmails");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Mail} />

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
