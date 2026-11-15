
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ExpensesPage() {
  const today = new Date().toLocaleDateString("en-CA");

  const [expenseName, setExpenseName] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function addExpense(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("expenses").insert({
      expense_name: expenseName,
      amount: Number(amount),
      expense_date: expenseDate,
      notes: notes,
    });

    setLoading(false);

    if (error) {
      setMessage("تعذر إضافة المصروف: " + error.message);
      return;
    }

    setExpenseName("");
    setAmount("");
    setExpenseDate(today);
    setNotes("");
    setMessage("تم إضافة المصروف بنجاح");
  }

  return (
    <main style={{
      direction: "rtl",
      padding: 25,
      maxWidth: 600,
      margin: "auto",
      fontFamily: "Arial"
    }}>
      <h1>إضافة مصروف جديد</h1>

      <form onSubmit={addExpense}>
        <p>اسم المصروف</p>
        <input
          value={expenseName}
          onChange={(e) => setExpenseName(e.target.value)}
          required
          placeholder="مثال: شراء مستلزمات"
          style={{ padding: 12, width: "100%", boxSizing: "border-box" }}
        />

        <p>المبلغ بالجنيه</p>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="اكتب المبلغ"
          style={{ padding: 12, width: "100%", boxSizing: "border-box" }}
        />

        <p>تاريخ المصروف</p>
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
          style={{ padding: 12, width: "100%", boxSizing: "border-box" }}
        />

        <p>ملاحظات</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات إضافية (اختياري)"
          style={{
            padding: 12,
            width: "100%",
            boxSizing: "border-box",
            minHeight: 90
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 20,
            padding: 14,
            width: "100%",
            background: "#9d174d",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          {loading ? "جاري الحفظ..." : "حفظ المصروف"}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 20, fontWeight: "bold" }}>
          {message}
        </p>
      )}

      <p style={{ marginTop: 25 }}>
        <Link href="/accounting">العودة إلى الحسابات</Link>
      </p>
    </main>
  );
}
