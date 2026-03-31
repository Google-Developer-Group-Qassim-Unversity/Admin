import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { serverConfig } from '@/lib/config-server';
import * as crypto from 'crypto';

interface ExportTokenRow {
  name: string;
  "university id": number;
  "phone number": number;
  email: string;
  gender: "Male" | "Female";
}

interface ExportTokenPayload {
  data: ExportTokenRow[];
  metadata: {
    row_count: number;
    columns: string[];
    valid: boolean;
    validated_at: string;
    source: "sheet-processor";
  };
}

interface ExportToken {
  payload: ExportTokenPayload;
  signature: string;
}

function base64UrlToBase64(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  if (padding) {
    base64 += "=".repeat(padding);
  }
  return base64;
}

function decodeBase64(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function decodeToken(token: string): ExportToken | null {
  try {
    const base64 = base64UrlToBase64(token);
    const json = decodeBase64(base64);
    return JSON.parse(json) as ExportToken;
  } catch {
    return null;
  }
}

function canonicalize(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

function hmacSha256(secret: string, data: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

function verifyExportToken(token: string, secret: string): { valid: boolean; payload?: ExportTokenPayload; signature?: string; error?: string } {
  const decoded = decodeToken(token);

  if (!decoded) {
    return { valid: false, error: "Invalid token format" };
  }

  if (!decoded.signature.startsWith("hmac-sha256:")) {
    return { valid: false, error: "Invalid signature format" };
  }

  const signatureHash = decoded.signature.replace("hmac-sha256:", "");

  if (decoded.payload.metadata.source !== "sheet-processor") {
    return { valid: false, error: "Invalid token source" };
  }

  const canonicalPayload = canonicalize(decoded.payload);
  const expectedSignature = hmacSha256(secret, canonicalPayload);

  if (signatureHash !== expectedSignature) {
    return { valid: false, error: "Signature verification failed" };
  }

  return { valid: true, payload: decoded.payload, signature: decoded.signature };
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = verifyExportToken(token.trim(), serverConfig.sheetProcessorJwtSecret);

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error });
    }

    if (!result.payload?.metadata?.valid) {
      return NextResponse.json({
        valid: false,
        error: 'Token data is not valid. Go back to Sheet Processor and make sure all rows are valid.',
        data: result.payload?.data ?? [],
        metadata: result.payload?.metadata,
        signature: result.signature ?? null,
      });
    }

    return NextResponse.json({
      valid: true,
      data: result.payload?.data ?? [],
      metadata: result.payload?.metadata,
      signature: result.signature ?? null,
    });
  } catch (error) {
    console.error('Error verifying export token:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}