export interface ExportTokenRow {
  name: string;
  "university id": number;
  "phone number": number;
  email: string;
  gender: "Male" | "Female";
}

export interface ExportTokenPayload {
  data: ExportTokenRow[];
  metadata: {
    row_count: number;
    columns: string[];
    valid: boolean;
    validated_at: string;
    source: "sheet-processor";
  };
}

export interface VerifyResult {
  valid: boolean;
  data?: ExportTokenRow[];
  metadata?: ExportTokenPayload["metadata"];
  signature?: string;
  error?: string;
}

export function getSheetProcessorExportUrl(): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SHEET_PROCESSOR;
  if (!baseUrl) return null;

  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalized}`;
}