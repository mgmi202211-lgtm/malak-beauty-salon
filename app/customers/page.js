
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

  // تحويل الأرقام العربية إلى إنجليزية والسماح بالأرقام فقط
  // الحد الأقصى 11 رقمًا
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
    white: "#ffffff"
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
    fontFamily: "Arial"
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
    transition: "0.2s"
  };

  const cardStyle = {
    padding: "24px",
    margin: "22px 0",
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    background: colors.white,
    boxShadow: "0 5px 20px rgba(157,23,77,0.07)"
  };

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

    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length > 11) {
      setMessage("يرجى إدخال رقم هاتف صحيح لا يزيد عن 11 رقمًا");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("customers").insert({
      full_name: name.trim(),
      phone: cleanPhone
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

    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length > 11) {
      setMessage("يرجى إدخال رقم هاتف صحيح لا يزيد عن 11 رقمًا");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("customers")
      .update({
        full_name: name.trim(),
        phone: cleanPhone
      })
      .eq("id", editingId);

    setLoading(false);

    if (error) {
      setMessage("تعذر تعديل العميل: " + error.message);
      return;
    }

    const updatedName = name.trim();
    const updatedPhone = cleanPhone;
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
    setPhone(normalizePhone(customer.phone || ""));
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

    if (editingId === customer.id) {
      cancelEditing();
    }

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
    const printContent = document.getElementById(
      "customer-bookings-print"
    );

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
              font-size: 16px;
            }
            h2, h3 { color: #9d174d; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #999;
              padding: 12px;
              text-align: center;
              font-size: 15px;
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

  const lastVisit =
    completedBookings.length > 0
      ? [...completedBookings].sort(
          (a, b) =>
            new Date(b.booking_date) - new Date(a.booking_date)
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

  const statsCards = [
    {
      title: "إجمالي الحجوزات",
      value: customerBookings.length
    },
    {
      title: "الحجوزات المكتملة",
      value: completedBookings.length
    },
    {
      title: "قيمة الحجوزات المكتملة",
      value: `${completedTotal.toLocaleString("ar-EG")} جنيه`
    },
    {
      title: "آخر زيارة مكتملة",
      value: lastVisit
        ? new Date(lastVisit + "T00:00:00").toLocaleDateString("ar-EG")
        : "لا توجد زيارات مكتملة"
    }
  ];

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: "1250px",
        margin: "25px auto",
        padding: "20px",
        fontFamily: "Arial",
        color: colors.text,
        fontSize: "17px",
        lineHeight: 1.8,
        background: "#fffafd",
        minHeight: "100vh"
      }}
    >
      <div style={{ marginBottom: "25px" }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: colors.primary,
            color: colors.white,
            padding: "12px 22px",
            borderRadius: "12px",
            textDecoration: "none",
            fontWeight: "bold",
            fontSize: "16px"
          }}
        >
          🏠 العودة إلى الصفحة الرئيسية
        </Link>
      </div>

      <header
        style={{
          background: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.primary}, #c45b83)`,
          color: colors.white,
          padding: "30px 25px",
          borderRadius: "20px",
          marginBottom: "25px",
          boxShadow: "0 8px 24px rgba(157,23,77,0.16)"
        }}
      >
        <h1 style={{ margin: 0, fontSize: "30px" }}>
          إدارة العميلات
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: "18px" }}>
          صالون ملك للجمال والعناية
        </p>
      </header>

      <section style={cardStyle}>
        <h2
          style={{
            color: colors.primary,
            fontSize: "24px",
            marginTop: 0,
            marginBottom: "20px"
          }}
        >
          {editingId ? "تعديل بيانات العميلة" : "إضافة عميلة جديدة"}
        </h2>

        <form
          onSubmit={editingId ? updateCustomer : addCustomer}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "14px"
          }}
        >
          <input
            placeholder="اسم العميلة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={inputStyle}
          />

          <div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="رقم الهاتف - بحد أقصى 11 رقمًا"
              value={phone}
              onChange={(e) => setPhone(normalizePhone(e.target.value))}
              required
              style={inputStyle}
            />
            <small
              style={{
                display: "block",
                color: colors.muted,
                fontSize: "14px",
                marginTop: "5px"
              }}
            >
              {phone.length} / 11 رقم
            </small>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              gap: "8px"
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                ...buttonStyle,
                background: colors.primary,
                color: colors.white,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading
                ? "جارٍ الحفظ..."
                : editingId
                  ? "حفظ التعديل"
                  : "إضافة عميلة"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEditing}
                style={{
                  ...buttonStyle,
                  background: "#eee",
                  color: colors.text
                }}
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>

        {message && (
          <p
            role="status"
            style={{
              color: colors.primary,
              background: colors.pink,
              padding: "12px 16px",
              borderRadius: "10px",
              fontWeight: "bold",
              fontSize: "16px",
              marginTop: "18px"
            }}
          >
            {message}
          </p>
        )}
      </section>

      <section style={cardStyle}>
        <h2
          style={{
            color: colors.primary,
            fontSize: "24px",
            marginTop: 0
          }}
        >
          قائمة العميلات
        </h2>

        <input
          placeholder="ابحث بالاسم أو رقم الهاتف أو كود العميلة"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            ...inputStyle,
            marginBottom: "20px"
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "12px"
          }}
        >
          <strong style={{ fontSize: "17px" }}>
            عدد العميلات: {filteredCustomers.length}
          </strong>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "700px",
              borderCollapse: "separate",
              borderSpacing: 0,
              textAlign: "center",
              fontSize: "16px"
            }}
          >
            <thead>
              <tr style={{ background: colors.pink }}>
                {["كود العميلة", "اسم العميلة", "رقم الهاتف", "الإجراءات"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "15px 12px",
                        color: colors.primary,
                        borderBottom: `2px solid ${colors.border}`,
                        fontSize: "17px"
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    style={{
                      background: index % 2 === 0 ? "#fff" : "#fffafd"
                    }}
                  >
                    <td style={tableCellStyle}>{customer.customer_code}</td>
                    <td style={tableCellStyle}>{customer.full_name}</td>
                    <td style={tableCellStyle}>{customer.phone}</td>
                    <td style={tableCellStyle}>
                      <button
                        type="button"
                        onClick={() => startEditing(customer)}
                        style={{
                          ...buttonStyle,
                          background: colors.pink,
                          color: colors.primary
                        }}
                      >
                        تعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => showCustomerBookings(customer)}
                        style={{
                          ...buttonStyle,
                          background: colors.primary,
                          color: colors.white
                        }}
                      >
                        عرض الحجوزات
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCustomer(customer)}
                        style={{
                          ...buttonStyle,
                          background: "#fff0f0",
                          color: colors.danger
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: "25px",
                      fontSize: "17px",
                      color: colors.muted
                    }}
                  >
                    لا توجد نتائج مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedCustomer && (
        <section style={cardStyle}>
          <div id="customer-bookings-print">
            <h2
              style={{
                color: colors.primary,
                fontSize: "25px",
                marginTop: 0
              }}
            >
              سجل حجوزات العميلة: {selectedCustomer.full_name}
            </h2>

            <div
              style={{
                background: colors.light,
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "20px",
                fontSize: "17px"
              }}
            >
              <p>
                <strong>كود العميلة:</strong> {selectedCustomer.customer_code}
              </p>
              <p>
                <strong>رقم الهاتف:</strong> {selectedCustomer.phone}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "14px",
                margin: "20px 0"
              }}
            >
              {statsCards.map((item, index) => (
                <div
                  key={item.title}
                  style={{
                    background: index === 2 ? colors.primary : colors.pink,
                    color: index === 2 ? colors.white : colors.primary,
                    padding: "20px 14px",
                    borderRadius: "15px",
                    textAlign: "center",
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <h3
                    style={{
                      fontSize: "16px",
                      margin: "0 0 10px"
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "22px",
                      fontWeight: "bold",
                      margin: 0
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div
              style={{
                background: colors.light,
                padding: "20px",
                borderRadius: "14px",
                marginTop: "15px"
              }}
            >
              <h3
                style={{
                  color: colors.primary,
                  fontSize: "20px",
                  marginTop: 0
                }}
              >
                أكثر الخدمات طلبًا
              </h3>

              {favoriteServices.length > 0 ? (
                favoriteServices.map(([serviceName, count]) => (
                  <p
                    key={serviceName}
                    style={{ fontSize: "17px", margin: "8px 0" }}
                  >
                    {serviceName} — {count} مرات
                  </p>
                ))
              ) : (
                <p style={{ fontSize: "16px" }}>
                  لا توجد خدمات مكتملة حتى الآن
                </p>
              )}
            </div>

            <h3
              style={{
                color: colors.primary,
                fontSize: "21px",
                marginTop: "25px"
              }}
            >
              تفاصيل الحجوزات
            </h3>

            {bookingsLoading ? (
              <p style={{ fontSize: "17px" }}>جارٍ تحميل الحجوزات...</p>
            ) : customerBookings.length === 0 ? (
              <p style={{ fontSize: "17px" }}>
                لا توجد حجوزات مسجلة لهذه العميلة.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: "850px",
                    borderCollapse: "collapse",
                    textAlign: "center",
                    fontSize: "16px"
                  }}
                >
                  <thead style={{ background: colors.pink }}>
                    <tr>
                      {[
                        "رقم الحجز",
                        "الخدمة",
                        "السعر الحالي",
                        "التاريخ",
                        "الوقت",
                        "الحالة",
                        "الملاحظات"
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "13px 10px",
                            border: `1px solid ${colors.border}`,
                            color: colors.primary
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {customerBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td style={tableCellStyle}>{booking.id}</td>
                        <td style={tableCellStyle}>{booking.serviceName}</td>
                        <td style={tableCellStyle}>
                          {Number(booking.servicePrice).toLocaleString("ar-EG")} جنيه
                        </td>
                        <td style={tableCellStyle}>{booking.booking_date}</td>
                        <td style={tableCellStyle}>{booking.booking_time}</td>
                        <td style={tableCellStyle}>
                          {statusLabels[booking.status] || booking.status}
                        </td>
                        <td style={tableCellStyle}>
                          {booking.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "20px"
            }}
          >
            <button
              type="button"
              onClick={printCustomerBookings}
              style={{
                ...buttonStyle,
                background: colors.primary,
                color: colors.white
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
                color: colors.text
              }}
            >
              إغلاق السجل
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

const tableCellStyle = {
  padding: "14px 12px",
  borderBottom: "1px solid #ead5df",
  fontSize: "16px",
  verticalAlign: "middle"
};
