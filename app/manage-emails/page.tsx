"use client";

import * as React from "react";
import { Mail, Send, Terminal } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { EmailLogsTab } from "./email-logs-tab";
import { UsagePanel } from "./usage-panel";
import { AssetsPanel } from "./assets-panel";
import { SendCertificatesTab } from "./send-certificates-tab";

export default function ManageEmailsPage() {
  const [activeTab, setActiveTab] = React.useState("logs");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Emails</h1>
          <p className="text-sm text-muted-foreground">Monitor email logs, usage stats, and assets</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="logs">
                <Mail className="h-4 w-4" />
                Email Logs
              </TabsTrigger>
              <TabsTrigger value="certificates">
                <Send className="h-4 w-4" />
                Send Certificates
              </TabsTrigger>
              <TabsTrigger value="playground" disabled>
                <Terminal className="h-4 w-4" />
                Playground
              </TabsTrigger>
            </TabsList>
            <TabsContent value="logs" className="mt-4">
              <EmailLogsTab />
            </TabsContent>
            <TabsContent value="certificates" className="mt-4">
              <SendCertificatesTab onGoToLogs={() => setActiveTab("logs")} />
            </TabsContent>
            <TabsContent value="playground" className="mt-4">
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Coming soon
              </div>
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
