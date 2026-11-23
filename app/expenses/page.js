
"use client";

import { useEffect, useState } from "react";
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
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  async function loadExpenses() {
    setLoadingExpenses(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    setLoadingExpenses(false);
    if (error) {
      setMessage("تعذر تحميل سجل المصروفات: " + error.message);
      return;
    }
    setExpenses(data || []);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function deleteExpense(id) {
    if (!window.confirm("هل تريد حذف هذا المصروف؟")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      setMessage("تعذر حذف المصروف: " + error.message);
      return;
    }
    setMessage("تم حذف المصروف بنجاح");
    await loadExpenses();
  }

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
    await loadExpenses();
  }

  return (
    <main
      style={{
        direction: "rtl",
        padding: 25,
        maxWidth: 600,
        margin: "auto",
        fontFamily: "Arial",
      }}
    >
      <h1>إضافة مصروف جديد</h1>

      <form onSubmit={addExpense}>
        <p>اسم المصروف</p>
        <input
          value={expenseName}
          onChange={(e) => setExpenseName(e.target.value)}
          required
          placeholder="مثال: شراء مستلزمات"
          style={{
            padding: 12,
            width: "100%",
            boxSizing: "border-box",
          }}
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
          style={{
            padding: 12,
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        <p>تاريخ المصروف</p>
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
          style={{
            padding: 12,
            width: "100%",
            boxSizing: "border-box",
          }}
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
            minHeight: 90,
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
            cursor: "pointer",
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

      <section
        style={{
          marginTop: 35,
          padding: 20,
          border: "1px solid #f1dce5",
          borderRadius: 16,
          background: "#fffafd",
          overflowX: "auto",
        }}
      >
        <h2 style={{ color: "#922c5c", marginTop: 0 }}>سجل المصروفات</h2>
        {loadingExpenses ? (
          <p>جاري تحميل سجل المصروفات...</p>
        ) : expenses.length === 0 ? (
          <p>لا توجد مصروفات مسجلة حتى الآن.</p>
        ) : (
          <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8e8ef" }}>
                <th style={{ padding: 12, textAlign: "center" }}>المصروف</th>
                <th style={{ padding: 12, textAlign: "center" }}>المبلغ</th>
                <th style={{ padding: 12, textAlign: "center" }}>التاريخ</th>
                <th style={{ padding: 12, textAlign: "center" }}>ملاحظات</th>
                <th style={{ padding: 12, textAlign: "center" }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f3e5eb" }}>{item.expense_name}</td>
                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f3e5eb", fontWeight: "bold" }}>
                    {Number(item.amount || 0).toLocaleString("ar-EG")} جنيه
                  </td>
                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f3e5eb" }}>{item.expense_date}</td>
                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f3e5eb" }}>{item.notes || "-"}</td>
                  <td style={{ padding: 12, textAlign: "center", borderBottom: "1px solid #f3e5eb" }}>
                    <button
                      type="button"
                      onClick={() => deleteExpense(item.id)}
                      style={{
                        padding: "8px 14px",
                        border: "none",
                        borderRadius: 8,
                        background: "#fff0f0",
                        color: "#b42318",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 25,
        }}
      >
        <Link
          href="/"
          style={{
            display: "block",
            padding: 14,
            background: "#9d174d",
            color: "white",
            borderRadius: 8,
            textAlign: "center",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          العودة إلى الصفحة الرئيسية
        </Link>

        <Link
          href="/accounting"
          style={{
            display: "block",
            padding: 14,
            background: "#f8e8ef",
            color: "#9d174d",
            borderRadius: 8,
            textAlign: "center",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          العودة إلى الحسابات
        </Link>
      </div>
    </main>
  );
}
