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
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessage("تعذر تعديل حالة الحجز: " + error.message);
    } else {
      setMessage("تم تعديل حالة الحجز.");
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

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: 1000,
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
        عدد الحجوزات: {bookings.length}
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

      <div style={{ overflowX: "auto" }}>
        <table
          width="100%"
          border="1"
          cellPadding="10"
          style={{
            borderCollapse: "collapse",
            textAlign: "center",
            background: "white",
          }}
        >
          <thead style={{ background: "#fce7f3" }}>
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
            {bookings.map((booking) => {
              const customer = customers.find(
                (item) => String(item.id) === String(booking.customer_id)
              );

              const items = getBookingServices(booking);

              const total = items.reduce(
                (sum, item) => sum + item.price,
                0
              );

              return (
                <tr key={booking.id}>
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
                      value={booking.status || "pending"}
                      onChange={(e) =>
                        updateStatus(booking.id, e.target.value)
                      }
                      style={{
                        padding: 8,
                        minWidth: 110,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <option value="pending">جديد</option>
                      <option value="confirmed">مؤكد</option>
                      <option value="completed">مكتمل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </td>

                  <td>{booking.notes}</td>
                </tr>
              );
            })}

            {bookings.length === 0 && (
              <tr>
                <td colSpan="8">لا توجد حجوزات حتى الآن</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
