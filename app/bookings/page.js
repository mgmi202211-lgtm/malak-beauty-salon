
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function BookingsPage() {
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    const [customerResult, serviceResult, bookingResult] =
      await Promise.all([
        supabase.from("customers").select("*").order("full_name"),
        supabase.from("services").select("*").eq("active", true),
        supabase.from("bookings").select("*").order("booking_date", {
          ascending: false,
        }),
      ]);

    if (
      customerResult.error ||
      serviceResult.error ||
      bookingResult.error
    ) {
      setMessage(
        "خطأ في تحميل البيانات: " +
          (customerResult.error?.message ||
            serviceResult.error?.message ||
            bookingResult.error?.message)
      );
      return;
    }

    setCustomers(customerResult.data || []);
    setServices(serviceResult.data || []);
    setBookings(bookingResult.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  // البحث عن العميلة تلقائيًا برقم التليفون
  const normalizedSearch = customerSearch.replace(/\D/g, "");

  const matchedCustomers = normalizedSearch
    ? customers.filter((customer) => {
        const phone = String(customer.phone || "").replace(/\D/g, "");
        return phone === normalizedSearch;
      })
    : [];

  const matchedCustomer =
    matchedCustomers.length === 1 ? matchedCustomers[0] : null;

  // تحديث العميل المختار تلقائيًا
  useEffect(() => {
    if (matchedCustomer) {
      setCustomerId(String(matchedCustomer.id));
    } else {
      setCustomerId("");
    }
  }, [customerSearch, customers]);

  async function addBooking(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!matchedCustomer) {
      setLoading(false);
      setMessage("رقم التليفون غير موجود في قائمة العملاء.");
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      customer_id: matchedCustomer.id,
      service_id: serviceId,
      booking_date: date,
      booking_time: time,
      status: "pending",
      notes: notes,
    });

    setLoading(false);

    if (error) {
      setMessage("تعذر إضافة الحجز: " + error.message);
      return;
    }

    setCustomerId("");
    setCustomerSearch("");
    setServiceId("");
    setDate("");
    setTime("");
    setNotes("");
    setMessage("تم إضافة الحجز بنجاح");

    await loadData();
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMessage("تعذر تعديل حالة الحجز: " + error.message);
    } else {
      setMessage("تم تعديل حالة الحجز");
      await loadData();
    }
  }

  const inputStyle = {
    padding: 12,
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #e5c5d5",
    borderRadius: 8,
    marginTop: 5,
  };

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

      <h2>إضافة حجز جديد</h2>

      <form
        onSubmit={addBooking}
        style={{
          background: "#fff7fb",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #f0d5e2",
        }}
      >
        <p>رقم تليفون العميلة</p>

        <input
          type="tel"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          placeholder="اكتبي رقم التليفون"
          style={inputStyle}
          required
        />

        {matchedCustomer ? (
          <p
            style={{
              color: "#15803d",
              fontWeight: "bold",
              background: "#f0fdf4",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <span>✓ اسم العميلة: </span>
            {matchedCustomer.full_name}
          </p>
        ) : normalizedSearch ? (
          <p
            style={{
              color: "#b45309",
              fontWeight: "bold",
            }}
          >
            {matchedCustomers.length > 1
              ? "يوجد أكثر من عميلة بهذا الرقم، يرجى مراجعة بيانات العملاء."
              : "رقم التليفون غير مسجل في قائمة العملاء."}
          </p>
        ) : null}

        <p>اختيار الخدمة</p>

        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          required
          style={inputStyle}
        >
          <option value="">اختاري الخدمة</option>

          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.service_name} - {service.price} جنيه
            </option>
          ))}
        </select>

        <p>تاريخ الحجز</p>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          style={inputStyle}
        />

        <p>وقت الحجز</p>

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          style={inputStyle}
        />

        <p>ملاحظات</p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات إضافية"
          style={{ ...inputStyle, minHeight: 80 }}
        />

        <button
          type="submit"
          disabled={loading || !matchedCustomer}
          style={{
            padding: 12,
            marginTop: 15,
            width: "100%",
            background: "#9d174d",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
            opacity: loading || !matchedCustomer ? 0.6 : 1,
          }}
        >
          {loading ? "جارٍ الحفظ..." : "إضافة الحجز"}
        </button>
      </form>

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

      <hr style={{ margin: "30px 0" }} />

      <h2>قائمة الحجوزات</h2>

      <p style={{ fontWeight: "bold" }}>
        عدد الحجوزات: {bookings.length}
      </p>

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
              <th>الخدمة</th>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>الحالة</th>
              <th>الملاحظات</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((booking) => {
              const customer = customers.find(
                (item) =>
                  String(item.id) === String(booking.customer_id)
              );

              const service = services.find(
                (item) =>
                  String(item.id) === String(booking.service_id)
              );

              return (
                <tr key={booking.id}>
                  <td>{booking.id}</td>

                  <td>
                    {customer?.customer_code || booking.customer_id}
                  </td>

                  <td>
                    {service?.service_name || booking.service_id}
                  </td>

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
                <td colSpan="7">
                  لا توجد حجوزات حتى الآن
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
