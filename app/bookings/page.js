
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AuthGuard, { useSalonRole } from "../components/AuthGuard";

function BookingsContent() {
  const { role } = useSalonRole();
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingServices, setBookingServices] = useState([]);
  const [message, setMessage] = useState("");
  const [editingBooking, setEditingBooking] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadData() {
    const [
      customerResult,
      serviceResult,
      bookingResult,
      bookingServicesResult,
    ] = await Promise.all([
      supabase.from("customers").select("*").order("full_name"),
      supabase.from("services").select("*"),
      supabase.from("bookings").select("*").order("booking_date", {
        ascending: false,
      }),
      supabase.from("booking_services").select("*"),
    ]);

    const error =
      customerResult.error ||
      serviceResult.error ||
      bookingResult.error ||
      bookingServicesResult.error;

    if (error) {
      setMessage("خطأ في تحميل البيانات: " + error.message);
      return;
    }

    setCustomers(customerResult.data || []);
    setServices(serviceResult.data || []);
    setBookings(bookingResult.data || []);
    setBookingServices(bookingServicesResult.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function startEditingBooking(booking) {
    const saved = bookingServices
      .filter((item) => String(item.booking_id) === String(booking.id))
      .map((item) => String(item.service_id));
    const serviceIds = saved.length ? saved : [String(booking.service_id)];

    setEditingBooking(booking.id);
    setEditDraft({
      customer_id: String(booking.customer_id || ""),
      booking_date: booking.booking_date || "",
      booking_time: String(booking.booking_time || "").slice(0, 5),
      status: getBookingStatus(booking),
      notes: booking.notes || "",
      discount_amount: String(booking.discount_amount || 0),
      service_ids: serviceIds,
    });
    setMessage("");
  }

  async function saveBookingEdit(event) {
    event.preventDefault();
    if (!editingBooking || !editDraft) return;

    const selectedLines = editDraft.service_ids
      .map((id) => services.find((service) => String(service.id) === String(id)))
      .filter(Boolean)
      .map((service) => ({
        service_id: Number(service.id),
        price: Number(service.price || 0),
      }));

    const discount = Number(editDraft.discount_amount || 0);
    const total = selectedLines.reduce((sum, line) => sum + line.price, 0);

    if (!editDraft.customer_id || !editDraft.booking_date || !editDraft.booking_time) {
      setMessage("يرجى استكمال العميلة والتاريخ والوقت.");
      return;
    }
    if (selectedLines.length === 0) {
      setMessage("يجب اختيار خدمة واحدة على الأقل.");
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > total) {
      setMessage("قيمة الخصم غير صحيحة أو أكبر من إجمالي الخدمات.");
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase.rpc("manager_update_booking", {
      p_booking_id: Number(editingBooking),
      p_customer_id: Number(editDraft.customer_id),
      p_booking_date: editDraft.booking_date,
      p_booking_time: editDraft.booking_time,
      p_status: editDraft.status,
      p_notes: editDraft.notes || "",
      p_discount_amount: discount,
      p_service_lines: selectedLines,
    });
    setSavingEdit(false);

    if (error) {
      setMessage("تعذر حفظ تعديل الحجز: " + error.message);
      return;
    }

    setMessage("تم تعديل الحجز وتحديث إيراده في الحسابات.");
    setEditingBooking(null);
    setEditDraft(null);
    await loadData();
  }

  async function updateStatus(id, status) {
    const currentBooking = bookings.find(
      (booking) => String(booking.id) === String(id)
    );

    // منع تعديل الحجز بعد اعتماده أو اعتماد حجز ملغي مباشرة
    if (role !== "manager" && currentBooking && getBookingStatus(currentBooking) === "completed") {
      setMessage("لا يمكن تغيير حالة حجز مكتمل.");
      return;
    }

    if (role !== "manager" && currentBooking && getBookingStatus(currentBooking) === "cancelled" && status === "completed") {
      setMessage("لا يمكن اعتماد حجز ملغي مباشرة. راجع حالته أولاً.");
      return;
    }

    if (status === "completed" && !window.confirm("تأكيد اكتمال الخدمة؟ سيتم اعتماد إيرادها مرة واحدة في الحسابات.")) {
      return;
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessage("تعذر تعديل حالة الحجز: " + error.message);
    } else {
      setMessage(status === "completed"
        ? "تم اعتماد الخدمة وتسجيل إيرادها مرة واحدة."
        : "تم تعديل حالة الحجز.");
      await loadData();
    }
  }

  function getBookingServices(booking) {
    const savedServices = bookingServices.filter(
      (item) => String(item.booking_id) === String(booking.id)
    );

    if (savedServices.length > 0) {
      return savedServices.map((item) => {
        const service = services.find(
          (s) => String(s.id) === String(item.service_id)
        );

        return {
          name: service?.service_name || `خدمة رقم ${item.service_id}`,
          price: Number(item.price) || 0,
        };
      });
    }

    const oldService = services.find(
      (item) => String(item.id) === String(booking.service_id)
    );

    return [
      {
        name: oldService?.service_name || `خدمة رقم ${booking.service_id}`,
        price: Number(oldService?.price) || 0,
      },
    ];
  }

  // تقسيم الحجوزات حسب الحالة
  const bookingGroups = [
    {
      status: "pending",
      title: "الحجوزات الجديدة",
      color: "#d97706",
      background: "#fff7ed",
    },
    {
      status: "completed",
      title: "الحجوزات المكتملة",
      color: "#15803d",
      background: "#f0fdf4",
    },
    {
      status: "cancelled",
      title: "الحجوزات الملغاة",
      color: "#b42336",
      background: "#fef2f2",
    },
  ];

  // توحيد عرض الحالة الفارغة باعتبارها حجزًا جديدًا
  function getBookingStatus(booking) {
    return !booking.status || booking.status === "confirmed" ? "pending" : booking.status;
  }

  function renderBookingTable(group) {
    const groupBookings = bookings.filter(
      (booking) => getBookingStatus(booking) === group.status
    );

    return (
      <section
        key={group.status}
        style={{
          marginTop: 30,
          padding: 20,
          border: `1px solid ${group.color}33`,
          borderRadius: 14,
          background: "white",
          boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 18,
            padding: 12,
            borderRadius: 10,
            background: group.background,
          }}
        >
          <h2
            style={{
              color: group.color,
              margin: 0,
              fontSize: 21,
            }}
          >
            {group.title}
          </h2>

          <span
            style={{
              padding: "7px 15px",
              background: group.color,
              color: "white",
              borderRadius: 20,
              fontWeight: "bold",
            }}
          >
            {groupBookings.length} حجز
          </span>
        </div>

        {groupBookings.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "#777",
              padding: 20,
            }}
          >
            لا توجد حجوزات في هذا القسم
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              width="100%"
              cellPadding="10"
              style={{
                borderCollapse: "collapse",
                textAlign: "center",
                background: "white",
                minWidth: 850,
              }}
            >
              <thead style={{ background: group.background }}>
                <tr>
                  <th>رقم الحجز</th>
                  <th>كود العميلة</th>
                  <th>الخدمات</th>
                  <th>الإجمالي</th>
                  <th>التاريخ</th>
                  <th>الوقت</th>
                  <th>الحالة</th>
                  <th>الملاحظات</th>
                  {role === "manager" && <th>الإجراءات</th>}
                </tr>
              </thead>

              <tbody>
                {groupBookings.map((booking) => {
                  const customer = customers.find(
                    (item) =>
                      String(item.id) === String(booking.customer_id)
                  );

                  const items = getBookingServices(booking);

                  const total = items.reduce(
                    (sum, item) => sum + item.price,
                    0
                  );

                  const isCompleted =
                    getBookingStatus(booking) === "completed";

                  return (
                    <tr
                      key={booking.id}
                      style={{
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <td>{booking.id}</td>

                      <td>
                        {customer?.customer_code || booking.customer_id}
                      </td>

                      <td>
                        {items.map((item, index) => (
                          <div key={index}>
                            {item.name}
                          </div>
                        ))}
                      </td>

                      <td>{total.toFixed(2)} جنيه</td>

                      <td>{booking.booking_date}</td>

                      <td>{booking.booking_time}</td>

                      <td>
                        <select
                          value={getBookingStatus(booking)}
                          disabled={role !== "manager"}
                          onChange={(e) =>
                            updateStatus(booking.id, e.target.value)
                          }
                          style={{
                            padding: 8,
                            minWidth: 110,
                            borderRadius: 6,
                            cursor: isCompleted ? "not-allowed" : "pointer",
                            border: "1px solid #ddd",
                            background: isCompleted ? "#e5e7eb" : "white",
                            color: isCompleted ? "#15803d" : "#333",
                            fontWeight: isCompleted ? "bold" : "normal",
                            opacity: isCompleted ? 1 : 1,
                          }}
                        >
                          <option value="pending">جديد</option>
                          <option value="completed">مكتمل — اعتماد الإيراد</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>

                      <td>{booking.notes || "-"}</td>
                      {role === "manager" && (
                        <td>
                          <button
                            type="button"
                            onClick={() => startEditingBooking(booking)}
                            style={{ padding: "8px 12px", border: "none", borderRadius: 7, background: "#9d174d", color: "white", cursor: "pointer", fontWeight: "bold" }}
                          >
                            تعديل الحجز
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: 1100,
        margin: "30px auto",
        padding: 20,
        fontFamily: "Arial",
        color: "#4a1932",
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "12px 20px",
          background: "#9d174d",
          color: "white",
          textDecoration: "none",
          borderRadius: 8,
          marginBottom: 20,
          fontWeight: "bold",
        }}
      >
        ← العودة إلى الصفحة الرئيسية
      </Link>

      <h1 style={{ color: "#9d174d" }}>
        إدارة الحجوزات - صالون ملك
      </h1>

      <hr />

      <h2>قائمة الحجوزات</h2>

      <p style={{ fontWeight: "bold" }}>
        إجمالي عدد الحجوزات: {bookings.length}
      </p>

      {message && (
        <p
          style={{
            padding: 12,
            background: "#fff0f6",
            color: "#9d174d",
            borderRadius: 8,
            marginTop: 15,
          }}
        >
          {message}
        </p>
      )}
      {role === "manager" && editingBooking && editDraft && (
        <section style={{ marginTop: 20, padding: 20, border: "1px solid #ead5df", borderRadius: 14, background: "#fffafd" }}>
          <h2 style={{ color: "#9d174d", marginTop: 0 }}>تعديل الحجز رقم {editingBooking}</h2>
          <form onSubmit={saveBookingEdit} style={{ display: "grid", gap: 14 }}>
            <label>
              العميلة
              <select value={editDraft.customer_id} onChange={(e) => setEditDraft({ ...editDraft, customer_id: e.target.value })} required style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}>
                <option value="">اختيار العميلة</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} — {customer.phone}</option>)}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label>التاريخ<input type="date" value={editDraft.booking_date} onChange={(e) => setEditDraft({ ...editDraft, booking_date: e.target.value })} required style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }} /></label>
              <label>الوقت<input type="time" value={editDraft.booking_time} onChange={(e) => setEditDraft({ ...editDraft, booking_time: e.target.value })} required style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }} /></label>
              <label>الحالة<select value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })} style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}><option value="pending">جديد</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select></label>
              <label>الخصم<input type="number" min="0" step="0.01" value={editDraft.discount_amount} onChange={(e) => setEditDraft({ ...editDraft, discount_amount: e.target.value })} style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }} /></label>
            </div>
            <div>
              <strong>الخدمات والأسعار</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 8 }}>
                {services.map((service) => (
                  <label key={service.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 9, border: "1px solid #ead5df", borderRadius: 8 }}>
                    <input type="checkbox" checked={editDraft.service_ids.includes(String(service.id))} onChange={(e) => setEditDraft({ ...editDraft, service_ids: e.target.checked ? [...editDraft.service_ids, String(service.id)] : editDraft.service_ids.filter((id) => id !== String(service.id))})} />
                    <span>{service.service_name} — {Number(service.price || 0).toLocaleString("ar-EG")} جنيه</span>
                  </label>
                ))}
              </div>
            </div>
            <label>ملاحظات<textarea value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} rows={3} style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }} /></label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={savingEdit} style={{ padding: "12px 20px", border: 0, borderRadius: 8, background: "#9d174d", color: "white", cursor: "pointer" }}>{savingEdit ? "جارٍ الحفظ..." : "حفظ كل التعديلات"}</button>
              <button type="button" onClick={() => { setEditingBooking(null); setEditDraft(null); }} style={{ padding: "12px 20px", border: 0, borderRadius: 8, background: "#eee", cursor: "pointer" }}>إلغاء</button>
            </div>
          </form>
        </section>
      )}

      {/* عرض الأقسام بالترتيب المحدد */}
      {bookingGroups.map((group) => renderBookingTable(group))}
    </main>
  );
}

export default function BookingsPage() {
  return (
    <AuthGuard>
      <BookingsContent />
    </AuthGuard>
  );
}
