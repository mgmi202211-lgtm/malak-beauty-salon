
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function BookingsPage() {
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingServices, setBookingServices] = useState([]);
  const [message, setMessage] = useState("");

  async function loadData() {
    const [
      customerResult,
      serviceResult,
      bookingResult,
      bookingServicesResult,
    ] = await Promise.all([
      supabase.from("customers").select("*").order("full_name"),
      supabase.from("services").select("*").eq("active", true),
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

  async function updateStatus(id, status) {
    const currentBooking = bookings.find(
      (booking) => String(booking.id) === String(id)
    );

    // منع تعديل الحجز بعد اعتماده أو اعتماد حجز ملغي مباشرة
    if (currentBooking && getBookingStatus(currentBooking) === "completed") {
      setMessage("لا يمكن تغيير حالة حجز مكتمل.");
      return;
    }

    if (currentBooking && getBookingStatus(currentBooking) === "cancelled" && status === "completed") {
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
      status: "confirmed",
      title: "الحجوزات المؤكدة",
      color: "#2563eb",
      background: "#eff6ff",
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
    return booking.status || "pending";
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
                          disabled={isCompleted}
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
                          <option value="confirmed">مؤكد</option>
                          <option value="completed">مكتمل — اعتماد الإيراد</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>

                      <td>{booking.notes || "-"}</td>
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

      {/* عرض الأقسام بالترتيب المحدد */}
      {bookingGroups.map((group) => renderBookingTable(group))}
    </main>
  );
}
