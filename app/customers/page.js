
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

    const { error } = await supabase.from("customers").insert({
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
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("customers")
      .update({
        full_name: name,
        phone: phone
      })
      .eq("id", editingId);

    setLoading(false);

    if (error) {
      setMessage("تعذر تعديل العميل: " + error.message);
      return;
    }

    const updatedName = name;
    const updatedPhone = phone;
    const updatedId = editingId;

    setEditingId(null);
    setName("");
    setPhone("");
    setMessage("تم تعديل بيانات العميل بنجاح");

    await loadCustomers();

    if (selectedCustomer?.id === updatedId) {
      setSelectedCustomer((old) => ({
        ...old,
        full_name: updatedName,
        phone: updatedPhone
      }));
    }
  }

  function startEditing(customer) {
    setEditingId(customer.id);
    setName(customer.full_name || "");
    setPhone(customer.phone || "");
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setName("");
    setPhone("");
    setMessage("");
  }

  async function deleteCustomer(customer) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف العميل: " + customer.full_name + "؟"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    if (error) {
      setMessage("تعذر حذف العميل: " + error.message);
      return;
    }

    if (editingId === customer.id) cancelEditing();

    if (selectedCustomer?.id === customer.id) {
      setSelectedCustomer(null);
      setCustomerBookings([]);
    }

    setMessage("تم حذف العميل بنجاح");
    await loadCustomers();
  }

  async function showCustomerBookings(customer) {
    setSelectedCustomer(customer);
    setCustomerBookings([]);
    setBookingsLoading(true);
    setMessage("");

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", customer.id)
      .order("booking_date", { ascending: false });

    if (error) {
      setMessage("تعذر تحميل حجوزات العميلة: " + error.message);
      setBookingsLoading(false);
      return;
    }

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, service_name, price");

    if (servicesError) {
      setMessage("تعذر تحميل الخدمات: " + servicesError.message);
      setBookingsLoading(false);
      return;
    }

    const result = (bookings || []).map((booking) => {
      const service = (services || []).find(
        (item) => String(item.id) === String(booking.service_id)
      );

      return {
        ...booking,
        serviceName: service?.service_name || "خدمة غير موجودة",
        servicePrice: service?.price ?? 0
      };
    });

    setCustomerBookings(result);
    setBookingsLoading(false);
  }

  function printCustomerBookings() {
    const printContent = document.getElementById("customer-bookings-print");

    if (!printContent) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");
      return;
    }

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>سجل حجوزات العميلة</title>
          <style>
            body {
              font-family: Arial;
              padding: 25px;
              direction: rtl;
            }
            h2 { color: #9d174d; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #999;
              padding: 10px;
              text-align: center;
            }
            th { background: #fce7f3; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  const filteredCustomers = customers.filter((customer) => {
    const searchText = search.trim().toLowerCase();

    return (
      (customer.full_name || "").toLowerCase().includes(searchText) ||
      (customer.phone || "").includes(searchText) ||
      (customer.customer_code || "").toLowerCase().includes(searchText)
    );
  });

  const statusLabels = {
    pending: "جديد",
    confirmed: "مؤكد",
    completed: "مكتمل",
    cancelled: "ملغي"
  };

  const completedBookings = customerBookings.filter(
    (booking) => booking.status === "completed"
  );

  const completedTotal = completedBookings.reduce(
    (total, booking) => total + Number(booking.servicePrice || 0),
    0
  );

  const lastVisit = completedBookings.length > 0
    ? [...completedBookings].sort(
        (a, b) => new Date(b.booking_date) - new Date(a.booking_date)
      )[0].booking_date
    : null;

  const favoriteServices = Object.entries(
    completedBookings.reduce((counts, booking) => {
      const serviceName = booking.serviceName;
      counts[serviceName] = (counts[serviceName] || 0) + 1;
      return counts;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const boxStyle = {
    padding: "18px",
    margin: "20px 0",
    border: "1px solid #ead5df",
    borderRadius: "12px",
    background: "#fff8fb"
  };

  const buttonStyle = {
    padding: "10px 16px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    margin: "4px"
  };

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: "1100px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial"
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#9d174d",
            color: "white",
            padding: "10px 18px",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: "bold"
          }}
        >
          🏠 العودة إلى الصفحة الرئيسية
        </Link>
      </div>

      <h1 style={{ color: "#9d174d" }}>
        إدارة العملاء - صالون ملك
      </h1>

      <section style={boxStyle}>
        <h2 style={{ color: "#9d174d" }}>
          {editingId ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
        </h2>

        <form onSubmit={editingId ? updateCustomer : addCustomer}>
          <input
            placeholder="اسم العميل"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              padding: "12px",
              margin: "5px",
              width: "40%",
              boxSizing: "border-box"
            }}
          />

          <input
            type="tel"
            placeholder="رقم الهاتف"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{
              padding: "12px",
              margin: "5px",
              width: "40%",
              boxSizing: "border-box"
            }}
          />

          <div style={{ marginTop: "10px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...buttonStyle,
                background: "#9d174d",
                color: "white"
              }}
            >
              {loading
                ? "جارٍ الحفظ..."
                : editingId
                  ? "حفظ التعديل"
                  : "إضافة عميل"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEditing}
                style={{
                  ...buttonStyle,
                  background: "#eee",
                  color: "#333"
                }}
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>

        {message && (
          <p style={{ color: "#9d174d", fontWeight: "bold" }}>
            {message}
          </p>
        )}
      </section>

      <h2 style={{ color: "#9d174d" }}>قائمة العملاء</h2>

      <input
        placeholder="ابحث بالاسم أو رقم الهاتف أو كود العميل"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "12px",
          width: "100%",
          marginBottom: "15px",
          boxSizing: "border-box",
          border: "1px solid #ead5df",
          borderRadius: "8px"
        }}
      />

      <div style={{ overflowX: "auto" }}>
        <table
          width="100%"
          border="1"
          cellPadding="10"
          style={{ borderCollapse: "collapse", textAlign: "center" }}
        >
          <thead style={{ background: "#fce7f3" }}>
            <tr>
              <th>كود العميل</th>
              <th>اسم العميل</th>
              <th>رقم الهاتف</th>
              <th>الإجراءات</th>
            </tr>
          </thead>

          <tbody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.customer_code}</td>
                  <td>{customer.full_name}</td>
                  <td>{customer.phone}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => startEditing(customer)}
                      style={{
                        ...buttonStyle,
                        background: "#fce7f3"
                      }}
                    >
                      تعديل
                    </button>

                    <button
                      type="button"
                      onClick={() => showCustomerBookings(customer)}
                      style={{
                        ...buttonStyle,
                        background: "#9d174d",
                        color: "white"
                      }}
                    >
                      عرض الحجوزات
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCustomer(customer)}
                      style={{
                        ...buttonStyle,
                        background: "#eee",
                        color: "#9d174d"
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">لا توجد نتائج مطابقة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <section style={boxStyle}>
          <div id="customer-bookings-print">
            <h2 style={{ color: "#9d174d" }}>
              سجل حجوزات العميلة: {selectedCustomer.full_name}
            </h2>

            <p>كود العميلة: {selectedCustomer.customer_code}</p>
            <p>رقم الهاتف: {selectedCustomer.phone}</p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                margin: "20px 0"
              }}
            >
              <div style={{
                background: "white",
                padding: "15px",
                borderRadius: "10px",
                textAlign: "center"
              }}>
                <h3>إجمالي الحجوزات</h3>
                <h2>{customerBookings.length}</h2>
              </div>

              <div style={{
                background: "white",
                padding: "15px",
                borderRadius: "10px",
                textAlign: "center"
              }}>
                <h3>الحجوزات المكتملة</h3>
                <h2>{completedBookings.length}</h2>
              </div>

              <div style={{
                background: "white",
                padding: "15px",
                borderRadius: "10px",
                textAlign: "center"
              }}>
                <h3>قيمة الحجوزات المكتملة</h3>
                <h2>{completedTotal.toLocaleString("ar-EG")} جنيه</h2>
              </div>

              <div style={{
                background: "white",
                padding: "15px",
                borderRadius: "10px",
                textAlign: "center"
              }}>
                <h3>آخر زيارة مكتملة</h3>
                <h2 style={{ fontSize: "18px" }}>
                  {lastVisit
                    ? new Date(lastVisit + "T00:00:00").toLocaleDateString("ar-EG")
                    : "لا توجد زيارات مكتملة"}
                </h2>
              </div>
            </div>

            <div style={{
              background: "white",
              padding: "15px",
              borderRadius: "10px",
              marginTop: "12px"
            }}>
              <h3 style={{ color: "#9d174d" }}>
                أكثر الخدمات طلبًا
              </h3>

              {favoriteServices.length > 0 ? (
                favoriteServices.map(([serviceName, count]) => (
                  <p key={serviceName}>
                    {serviceName} — {count} مرات
                  </p>
                ))
              ) : (
                <p>لا توجد خدمات مكتملة حتى الآن</p>
              )}
            </div>

            <h3 style={{ color: "#9d174d" }}>تفاصيل الحجوزات</h3>

            {bookingsLoading ? (
              <p>جارٍ تحميل الحجوزات...</p>
            ) : customerBookings.length === 0 ? (
              <p>لا توجد حجوزات مسجلة لهذه العميلة.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  width="100%"
                  border="1"
                  cellPadding="10"
                  style={{ borderCollapse: "collapse", textAlign: "center" }}
                >
                  <thead style={{ background: "#fce7f3" }}>
                    <tr>
                      <th>رقم الحجز</th>
                      <th>الخدمة</th>
                      <th>السعر الحالي</th>
                      <th>التاريخ</th>
                      <th>الوقت</th>
                      <th>الحالة</th>
                      <th>الملاحظات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customerBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.id}</td>
                        <td>{booking.serviceName}</td>
                        <td>
                          {Number(booking.servicePrice).toLocaleString("ar-EG")} جنيه
                        </td>
                        <td>{booking.booking_date}</td>
                        <td>{booking.booking_time}</td>
                        <td>{statusLabels[booking.status] || booking.status}</td>
                        <td>{booking.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={printCustomerBookings}
            style={{
              ...buttonStyle,
              background: "#9d174d",
              color: "white",
              marginTop: "15px"
            }}
          >
            طباعة سجل الحجوزات
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCustomer(null);
              setCustomerBookings([]);
            }}
            style={{
              ...buttonStyle,
              background: "#eee",
              color: "#333"
            }}
          >
            إغلاق السجل
          </button>
        </section>
      )}
    </main>
  );
}
