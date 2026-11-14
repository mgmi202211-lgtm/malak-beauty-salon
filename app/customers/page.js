
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("خطأ في تحميل العملاء: " + error.message);
      return;
    }

    setCustomers(data || []);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function addCustomer(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("customers")
      .insert({
        full_name: name,
        phone: phone
      });

    setLoading(false);

    if (error) {
      setMessage("تعذر إضافة العميل: " + error.message);
      return;
    }

    setName("");
    setPhone("");
    setMessage("تمت إضافة العميل بنجاح");
    await loadCustomers();
  }
async function updateCustomer(e) {
  e.preventDefault();

  const { error } = await supabase
    .from("customers")
    .update({
      full_name: name,
      phone: phone
    })
    .eq("id", editingId);

  if (error) {
    setMessage("تعذر تعديل العميل: " + error.message);
    return;
  }

  setEditingId(null);
  setName("");
  setPhone("");
  setMessage("تم تعديل بيانات العميل بنجاح");
  await loadCustomers();
}

function startEditing(customer) {
  setEditingId(customer.id);
  setName(customer.full_name || "");
  setPhone(customer.phone || "");
}
  const filteredCustomers = customers.filter((customer) => {
    const searchText = search.trim().toLowerCase();

    return (
      (customer.full_name || "").toLowerCase().includes(searchText) ||
      (customer.phone || "").includes(searchText) ||
      (customer.customer_code || "").toLowerCase().includes(searchText)
    );
  });

  return (
    <main dir="rtl" style={{
      maxWidth: "900px",
      margin: "30px auto",
      padding: "20px",
      fontFamily: "Arial"
    }}>
      <h1>إدارة العملاء - صالون ملك</h1>

      <form onSubmit={editingId ? updateCustomer : addCustomer}>
        <input
          placeholder="اسم العميل"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: "12px", margin: "5px", width: "40%" }}
        />

        <input
          placeholder="رقم الهاتف"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          style={{ padding: "12px", margin: "5px", width: "40%" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 25px", margin: "5px" }}
        >
          {loading ? "جاري الحفظ..." : "إضافة عميل"}
        </button>
      </form>

      <p>{message}</p>

      <h2>قائمة العملاء</h2>

      <input
        placeholder="ابحث بالاسم أو رقم الهاتف أو كود العميل"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "12px",
          width: "100%",
          marginBottom: "15px",
          boxSizing: "border-box"
        }}
      />

      <table width="100%" border="1" cellPadding="10">
        <thead>
          <tr>
            <th>كود العميل</th>
            <th>اسم العميل</th>
            <th>رقم الهاتف</th>
          </tr>
        </thead>

        <tbody>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.customer_code}</td>
                <td>{customer.full_name}</td>
                <td>{customer.phone}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">لا توجد نتائج مطابقة</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
