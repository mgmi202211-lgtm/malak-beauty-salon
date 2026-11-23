import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUCKET = "malak-daily-backups";
const PAGE_SIZE = 1000;
const RETENTION_DAYS = 30;

const TABLES = [
  { name: "profiles", primaryKey: "user_id" },
  { name: "customers", primaryKey: "id" },
  { name: "services", primaryKey: "id" },
  { name: "bookings", primaryKey: "id" },
  { name: "booking_services", primaryKey: "id" },
  { name: "booking_payments", primaryKey: "id" },
  { name: "booking_revenues", primaryKey: "id" },
  { name: "invoices", primaryKey: "id" },
  { name: "invoice_items", primaryKey: "id" },
  { name: "payments", primaryKey: "id" },
  { name: "expenses", primaryKey: "id" },
];

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function safeSecretMatch(received, expected) {
  if (!received || !expected) return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function cairoDateString(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function readAllRows(client, table) {
  const rows = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from(table.name)
      .select("*")
      .order(table.primaryKey, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`تعذر نسخ جدول ${table.name}: ${error.message}`);
    }

    const page = data || [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function removeExpiredBackups(storage) {
  const { data: files, error: listError } = await storage
    .from(BUCKET)
    .list("daily", { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (listError) {
    return { removed: 0, warning: "تعذر فحص النسخ القديمة." };
  }

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const expiredPaths = (files || [])
    .filter((file) => {
      const match = file.name.match(/^malak-backup-(\d{4}-\d{2}-\d{2})\.json$/);
      if (!match) return false;

      const fileDate = Date.parse(`${match[1]}T00:00:00Z`);
      return Number.isFinite(fileDate) && fileDate < cutoff;
    })
    .map((file) => `daily/${file.name}`);

  if (expiredPaths.length === 0) return { removed: 0 };

  const { error: removeError } = await storage.from(BUCKET).remove(expiredPaths);

  if (removeError) {
    return { removed: 0, warning: "تم إنشاء النسخة، لكن تعذر حذف بعض النسخ القديمة." };
  }

  return { removed: expiredPaths.length };
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") || "";
  const receivedSecret = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!cronSecret) {
    return jsonResponse({ success: false, error: "إعداد CRON_SECRET غير مكتمل." }, 500);
  }

  if (!safeSecretMatch(receivedSecret, cronSecret)) {
    return jsonResponse({ success: false, error: "غير مصرح." }, 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse(
      {
        success: false,
        error: "إعدادات الاتصال الآمن بقاعدة البيانات غير مكتملة.",
      },
      500
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const tables = {};
    const rowCounts = {};

    for (const table of TABLES) {
      tables[table.name] = await readAllRows(supabase, table);
      rowCounts[table.name] = tables[table.name].length;
    }

    const createdAt = new Date();
    const date = cairoDateString(createdAt);
    const filePath = `daily/malak-backup-${date}.json`;

    const backup = {
      metadata: {
        application: "Malak Beauty Salon",
        format_version: 1,
        created_at_utc: createdAt.toISOString(),
        date_timezone: "Africa/Cairo",
        retention_days: RETENTION_DAYS,
        table_count: TABLES.length,
        row_counts: rowCounts,
      },
      tables,
    };

    const backupFile = Buffer.from(JSON.stringify(backup), "utf8");
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, backupFile, {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`تعذر حفظ النسخة الاحتياطية: ${uploadError.message}`);
    }

    const cleanup = await removeExpiredBackups(supabase.storage);

    return jsonResponse({
      success: true,
      message: "تم إنشاء النسخة الاحتياطية اليومية بنجاح.",
      backup_file: filePath,
      created_at: createdAt.toISOString(),
      row_counts: rowCounts,
      removed_old_backups: cleanup.removed,
      cleanup_warning: cleanup.warning || null,
    });
  } catch (error) {
    console.error("Daily backup failed:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "حدث خطأ غير معروف أثناء النسخ الاحتياطي.",
      },
      500
    );
  }
}
