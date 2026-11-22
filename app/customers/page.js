```jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  function normalizePhone(value) {
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

    return String(value || "")
      .replace(/[٠-٩]/g, (digit) =>
        String(arabicDigits.indexOf(digit))
      )
      .replace(/\D/g, "")
      .slice(0, 11);
  }

  const colors = {
    primary: "#9d174d",
    primaryDark: "#831843",
    pink: "#fce7f3",
    light: "#fff8fb",
    gold: "#c49a45",
    border: "#ead5df",
    text: "#35232c",
    muted: "#715b65",
    danger: "#b42336",
    white: "#ffffff",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    fontSize: "17px",
    color: colors.text,
    background: colors.white,
    outlineColor: colors.primary,
    fontFamily: "Arial",
  };

  const buttonStyle = {
    padding: "12px 20px",
    border: "none",
    borderRadius: "11px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    margin: "4px",
    fontFamily: "Arial",
    transition: "0.2s",
  };

  const cardStyle = {
    padding: "24px",
    margin: "22px 0",
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    background: colors.white,
    boxShadow: "0 5px 20px rgba(157,23,77,0.07)",
  };

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("خطأ في تحميل العميلات: " + error.message);
      return;
    }

    setCustomers(data || []);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function startEditing(customer) {
    setEditingId(customer.id);
    setName(customer.full_name || "");
    setPhone(normalizePhone(customer.phone || ""));
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setName("");
    setPhone("");
    setMessage("");
  }

  async function updateCustomer(e) {
    e.preventDefault();

    if (!editingId) return;

    const cleanPhone =
