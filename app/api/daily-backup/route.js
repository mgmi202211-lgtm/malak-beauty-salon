import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUCKET = "malak-daily-backups";
const PAGE_SIZE = 1000;

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
    headers: {
      "Cache-Control": "no-store, private",
      "Vary": "Authorization",
    },
  });
}

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

async function getManagerClient(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = getBearerToken(request);

  if (!supabaseUrl || !anonKey || !secretKey) {
    return {
      error: jsonResponse(
        { success: false, error: "إعدادات النسخ الاحتياطي غير مكتملة على الخادم." },
        500
      ),
    };
  }

  if (!token) {
    return {
      error: jsonResponse(
        { success: false, error: "يجب تسجيل الدخول أولاً." },
        401
      ),
    };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userData, error: authError } = await authClient.auth.getUser(token);

  if (authError || !userData?.user) {
    return {
      error: jsonResponse(
        { success: false, error: "جلسة الدخول غير صالحة. سجّل الدخول مرة أخرى." },
        401
      ),
    };
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, active")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    return {
      error: jsonResponse(
        { success: false, error: "تعذر التحقق من صلاحيات الحساب." },
        500
      ),
    };
  }

  if (!profile || profile.role !== "manager" || profile.active !== true) {
    return {
      error: jsonResponse(
        { success: false, error: "إنشاء النسخ الاحتياطية متاح للمدير فقط." },
        403
      ),
    };
  }

  return { adminClient };
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

export async function GET(request) {
  const { adminClient, error } = await getManagerClient(request);
  if (error) return error;

  const { data: files, error: listError } = await adminClient.storage
    .from(BUCKET)
    .list("manual", {
      limit: 100,
      sortBy: { column: "name", order: "desc" },
    });

  if (listError) {
    return jsonResponse(
      { success: false, error: "تعذر قراءة سجل النسخ الاحتياطية." },
      500
    );
  }

  const latest = (files || [])
    .filter((file) => /^malak-backup-.*\.json$/.test(file.name))
    .sort((a, b) => b.name.localeCompare(a.name))[0];

  return jsonResponse({
    authorized: true,
    last_backup: latest
      ? {
          name: latest.name,
          created_at: latest.created_at || latest.updated_at || null,
        }
      : null,
  });
}

export async function POST(request) {
  const { adminClient, error } = await getManagerClient(request);
  if (error) return error;

  try {
    const tables = {};
    const rowCounts = {};

    for (const table of TABLES) {
      tables[table.name] = await readAllRows(adminClient, table);
      rowCounts[table.name] = tables[table.name].length;
    }

    const createdAt = new Date();
    const fileName = `malak-backup-${createdAt
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    const filePath = `manual/${fileName}`;

    const backup = {
      metadata: {
        application: "Malak Beauty Salon",
        format_version: 1,
        backup_type: "manual",
        created_at_utc: createdAt.toISOString(),
        table_count: TABLES.length,
        row_counts: rowCounts,
      },
      tables,
    };

    const backupFile = Buffer.from(JSON.stringify(backup), "utf8");
    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(filePath, backupFile, {
        contentType: "application/json",
        cacheControl: "0",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`تعذر حفظ النسخة الاحتياطية: ${uploadError.message}`);
    }

    return jsonResponse({
      success: true,
      message: "تم إنشاء النسخة الاحتياطية بنجاح.",
      backup_file: filePath,
      created_at: createdAt.toISOString(),
      row_counts: rowCounts,
    });
  } catch (error) {
    console.error("Manual backup failed:", error);
    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير معروف أثناء النسخ الاحتياطي.",
      },
      500
    );
  }
}
