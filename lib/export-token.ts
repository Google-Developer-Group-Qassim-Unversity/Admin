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
