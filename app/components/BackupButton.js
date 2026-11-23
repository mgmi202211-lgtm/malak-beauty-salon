"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function BackupButton() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [message, setMessage] = useState("");

  async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error("سجّل الدخول أولاً.");
    return data.session;
  }

  useEffect(() => {
    let mounted = true;

    async function loadBackupStatus() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;

        const response = await fetch("/api/daily-backup", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) return;

        const result = await response.json();
        if (mounted && result.authorized) {
          setVisible(true);
          setLastBackup(result.last_backup || null);
        }
      } catch (error) {
        console.error("Backup status error:", error);
      }
    }

    loadBackupStatus();

    return () => {
      mounted = false;
    };
  }, []);

  async function createBackup() {
    if (busy) return;

    try {
      setBusy(true);
      setMessage("");

      const session = await getSession();
      const response = await fetch("/api/daily-backup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "تعذر إنشاء النسخة الاحتياطية.");
      }

      setLastBackup({
        name: result.backup_file.split("/").pop(),
        created_at: result.created_at,
      });
      setMessage("تم إنشاء النسخة الاحتياطية بنجاح.");
    } catch (error) {
      setMessage(error.message || "حدث خطأ أثناء النسخ الاحتياطي.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <aside
      dir="rtl"
      style={{
        position: "fixed",
        zIndex: 1000,
        left: 14,
        bottom: 14,
        width: "min(330px, calc(100vw - 28px))",
        padding: 14,
        border: "1px solid #b99a68",
        borderRadius: 14,
        background: "#352638",
        color: "#fff",
        boxShadow: "0 8px 28px rgba(0,0,0,.25)",
        fontFamily: "Arial",
      }}
    >
      <div style={{ color: "#e6c58c", fontWeight: "bold", marginBottom: 8 }}>
        النسخ الاحتياطي للصالون
      </div>
      <button
        type="button"
        onClick={createBackup}
        disabled={busy}
        style={{
          width: "100%",
          border: 0,
          borderRadius: 9,
          padding: "11px 12px",
          background: busy ? "#887b83" : "#a77b42",
          color: "#fff",
          fontWeight: "bold",
          fontSize: 14,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "جاري إنشاء النسخة..." : "إنشاء نسخة احتياطية الآن"}
      </button>
      <div style={{ color: "#e0d2dc", fontSize: 12, marginTop: 9, lineHeight: 1.7 }}>
        {lastBackup?.created_at
          ? `آخر نسخة: ${new Date(lastBackup.created_at).toLocaleString("ar-EG")}`
          : "لم يتم إنشاء نسخة احتياطية بعد."}
      </div>
      {message && (
        <div
          role="status"
          style={{
            color: message.includes("بنجاح") ? "#a8e6b8" : "#ffd0d0",
            fontSize: 12,
            marginTop: 7,
            lineHeight: 1.6,
          }}
        >
          {message}
        </div>
      )}
    </aside>
  );
}
