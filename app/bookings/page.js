
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function BookingsPage() {
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingServices, setBookingServices] = useState([]);

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  const normalizedSearch = customerSearch.replace(/\D/g, "");

  const matchedCustomers = normalizedSearch
    ? customers.filter((customer) => {
        const phone = String(customer.phone || "").replace(/\D/g, "");
        return phone === normalizedSearch;
      })
    : [];

  const matchedCustomer =
    matchedCustomers.length === 1 ? matchedCustomers[0] : null;

  function addSelectedService() {
    const service = services.find(
      (item) => String(item.id) === String(currentService)
    );

    if (!service) return;

    if (
      selectedServices.some(
        (item) => String(item.id) === String(service.id)
      )
    ) {
      setMessage("الخدمة مضافة بالفعل.");
      return;
    }

    setSelectedServices((previous) => [
      ...previous,
      {
        id: service.id,
        name: service.service_name,
        price: Number(service.price) || 0,
      },
    ]);

    setCurrentService("");
    setMessage("");
  }

  function removeSelectedService(id) {
    setSelectedServices((previous) =>
      previous.filter((item) => String(item.id) !== String(id))
    );
  }

  const totalPrice = selectedServices.reduce(
    (sum, item) => sum + item.price,
    0
  );

  async function addBooking(e) {
    e.preventDefault();

    if (!matchedCustomer) {
      setMessage("رقم التليفون غير موجود في قائمة العملاء.");
      return;
    }

    if (selectedServices.length === 0) {
      setMessage("اختاري خدمة واحدة على الأقل.");
      return;
    }

    setLoading(true);
    setMessage("");

    // حفظ الحجز الأساسي مع أول خدمة للحفاظ على التوافق القديم
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        customer_id: matchedCustomer.id,
        service_id: selectedServices[0].id,
        booking_date: date,
        booking_time: time,
        status: "pending",
        notes: notes,
      })
      .select()
      .single();

    if (bookingError) {
      setLoading(false);
      setMessage("تعذر إضافة الحجز: " + bookingError.message);
      return;
    }

    // حفظ جميع الخدمات وأسعارها
    const rows = selectedServices.map((service) => ({
      booking_id: booking.id,
      service_id: service.id,
      price: service.price,
    }));

    const { error: servicesError } = await supabase
      .from("booking_services")
      .insert(rows);

    if (servicesError) {
      // منع بقاء حجز ناقص إذا فشل حفظ الخدمات
      await supabase
        .from("bookings")
        .delete()
        .eq("id", booking.id);

      setLoading(false);
      setMessage("تعذر حفظ خدمات الحجز: " + servicesError.message);
      return;
    }

    setLoading(false);
    setCustomerSearch("");
    setSelectedServices([]);
    setCurrentService("");
    setDate("");
    setTime("");
    setNotes("");
    setMessage("تم إضافة الحجز وجميع الخدمات بنجاح.");

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
      setMessage("تم تعديل حالة الحجز.");
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
          <p style={{
            color: "#15803d",
            fontWeight: "bold",
            background: "#f0fdf4",
            padding: 12,
            borderRadius: 8,
          }}>
            ✓ اسم العميلة: {matchedCustomer.full_name}
          </p>
        ) : normalizedSearch ? (
          <p style={{ color: "#b45309", fontWeight: "bold" }}>
            {matchedCustomers.length > 1
              ? "يوجد أكثر من عميلة بهذا الرقم."
              : "رقم التليفون غير مسجل في قائمة العملاء."}
          </p>
        ) : null}

        <p>اختيار الخدمات</p>

        <select
          value={currentService}
          onChange={(e) => setCurrentService(e.target.value)}
          style={inputStyle}
        >
          <option value="">اختاري الخدمة</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.service_name} - {service.price} جنيه
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={addSelectedService}
          disabled={!currentService}
          style={{
            padding: 12,
            marginTop: 10,
            width: "100%",
            background: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          + إضافة الخدمة
        </button>

        {selectedServices.length > 0 && (
          <div style={{
            marginTop: 15,
            padding: 15,
            background: "white",
            borderRadius: 8,
            border: "1px solid #e5c5d5",
          }}>
            <h3>الخدمات المختارة</h3>

            {selectedServices.map((service) => (
              <div
                key={service.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderBottom: "1px solid #f0d5e2",
                }}
              >
                <span>
                  {service.name} - {service.price} جنيه
                </span>

                <button
                  type="button"
                  onClick={() => removeSelectedService(service.id)}
                  style={{
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    padding: "7px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  حذف
                </button>
              </div>
            ))}

            <h3 style={{ color: "#9d174d" }}>
              إجمالي الحجز: {totalPrice.toFixed(2)} جنيه
            </h3>
          </div>
        )}

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
          disabled={loading || !matchedCustomer || selectedServices.length === 0}
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
            opacity: loading || !matchedCustomer || selectedServices.length === 0 ? 0.6 : 1,
          }}
        >
          {loading ? "جارٍ الحفظ..." : "إضافة الحجز"}
        </button>
      </form>

      {message && (
        <p style={{
          padding: 12,
          background: "#fff0f6",
          color: "#9d174d",
          borderRadius: 8,
          marginTop: 15,
        }}>
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
