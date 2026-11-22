
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

    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length !== 11) {
      setMessage("يرجى إدخال رقم هاتف صحيح مكون من 11 رقمًا");
      return;
    }

    if (!name.trim()) {
      setMessage("يرجى إدخال اسم العميلة");
      return;
    }

    const duplicate = customers.find(
      (customer) =>
        String(customer.id) !== String(editingId) &&
        normalizePhone(customer.phone) === cleanPhone
    );

    if (duplicate) {
      setMessage("رقم الهاتف مسجل بالفعل لعميلة أخرى");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("customers")
      .update({
        full_name: name.trim(),
        phone: cleanPhone,
      })
      .eq("id", editingId);

    setLoading(false);

    if (error) {
      setMessage("تعذر تعديل بيانات العميلة: " + error.message);
      return;
    }

    setMessage("تم تعديل بيانات العميلة بنجاح");
    cancelEditing();
    await loadCustomers();

    if (
      selectedCustomer &&
      String(selectedCustomer.id) === String(editingId)
    ) {
      setSelectedCustomer({
        ...selectedCustomer,
        full_name: name.trim(),
        phone: cleanPhone,
      });
    }
  }

  async function deleteCustomer(customer) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف العميلة ${customer.full_name}؟`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    if (error) {
      setMessage("تعذر حذف العميلة: " + error.message);
      return;
    }

    if (
      selectedCustomer &&
      String(selectedCustomer.id) === String(customer.id)
    ) {
      setSelectedCustomer(null);
      setCustomerBookings([]);
    }

    if (String(editingId) === String(customer.id)) {
      cancelEditing();
    }

    setMessage("تم حذف العميلة");
    await loadCustomers();
  }

  async function showCustomerBookings(customer) {
    setSelectedCustomer(customer);
    setCustomerBookings([]);
    setBookingsLoading(true);
    setMessage("");

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", customer.id)
      .order("booking_date", { ascending: false });

    if (bookingsError) {
      setMessage("خطأ في تحميل الحجوزات: " + bookingsError.message);
      setBookingsLoading(false);
      return;
    }

    const bookings = bookingsData || [];
    let servicesByBooking = [];

    if (bookings.length > 0) {
      const { data, error } = await supabase
        .from("booking_services")
        .select("*")
        .in(
          "booking_id",
          bookings.map((booking) => booking.id)
        );

      if (error) {
        setMessage("خطأ في تحميل خدمات الحجوزات: " + error.message);
        setBookingsLoading(false);
        return;
      }

      servicesByBooking = data || [];
    }

    const { data: allServices, error: servicesError } = await supabase
      .from("services")
      .select("*");

    if (servicesError) {
      setMessage("خطأ في تحميل الخدمات: " + servicesError.message);
      setBookingsLoading(false);
      return;
    }

    const services = allServices || [];

    const preparedBookings = bookings.map((booking) => {
      const savedServices = servicesByBooking.filter(
        (item) => String(item.booking_id) === String(booking.id)
      );

      let items;

      if (savedServices.length > 0) {
        items = savedServices.map((item) => {
          const service = services.find(
            (s) => String(s.id) === String(item.service_id)
          );

          return {
            name:
              service?.service_name ||
              `خدمة رقم ${item.service_id}`,
            price: Number(item.price) || 0,
          };
        });
      } else {
        const oldService = services.find(
          (s) => String(s.id) === String(booking.service_id)
        );

        items = [
          {
            name:
              oldService?.service_name ||
              `خدمة رقم ${booking.service_id}`,
            price: Number(oldService?.price) || 0,
          },
        ];
      }

      return {
        ...booking,
        items,
        total: items.reduce((sum, item) => sum + item.price, 0),
      };
    });

    setCustomerBookings(preparedBookings);
    setBookingsLoading(false);
  }

  const filteredCustomers = customers.filter((customer) => {
    const query = search.trim().toLowerCase();

    return (
      String(customer.full_name || "").toLowerCase().includes(query) ||
      String(customer.phone || "").includes(normalizePhone(query)) ||
      String(customer.customer_code || "").toLowerCase().includes(query)
    );
  });

  const completedBookings = customerBookings.filter(
    (booking) => booking.status === "completed"
  );

  const completedTotal = completedBookings.reduce(
    (sum, booking) => sum + booking.total,
    0
  );

  const popularServices = {};

  completedBookings.forEach((booking) => {
    booking.items.forEach((item) => {
      popularServices[item.name] =
        (popularServices[item.name] || 0) + 1;
    });
  });

  const mostRequestedServices = Object.entries(popularServices).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: 1100,
        margin: "30px auto",
        padding: 20,
        fontFamily: "Arial",
        color: colors.text,
        background: colors.light,
        minHeight: "100vh",
      }}
    >
      {message && (
        <div
          style={{
            padding: 14,
            margin: "15px 0",
            background: colors.pink,
            color: colors.primaryDark,
            borderRadius: 10,
            fontWeight: "bold",
          }}
        >
          {message}
        </div>
      )}

      {editingId && (
        <section style={cardStyle}>
          <h2 style={{ color: colors.primary, marginTop: 0 }}>
            تعديل بيانات العميلة
          </h2>

          <form onSubmit={updateCustomer}>
            <div style={{ marginBottom: 15 }}>
              <label>اسم العميلة</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>رقم الهاتف</label>
              <input
                style={inputStyle}
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(normalizePhone(e.target.value))
                }
                maxLength={11}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...buttonStyle,
                background: colors.primary,
                color: colors.white,
              }}
            >
              {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              style={{
                ...buttonStyle,
                background: "#eee",
                color: colors.text,
              }}
            >
              إلغاء
            </button>
          </form>
        </section>
      )}

      <section style={cardStyle}>
        <h2 style={{ color: colors.primary, marginTop: 0 }}>
          قائمة العميلات
        </h2>

        <p>
          إجمالي عدد العميلات: <strong>{customers.length}</strong>
        </p>

        <input
          style={inputStyle}
          placeholder="ابحثي بالاسم أو رقم الهاتف أو كود العميلة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ overflowX: "auto", marginTop: 20 }}>
          <table
            width="100%"
            cellPadding="12"
            style={{
              borderCollapse: "collapse",
              textAlign: "center",
              background: colors.white,
            }}
          >
            <thead style={{ background: colors.pink }}>
              <tr>
                <th>كود العميلة</th>
                <th>الاسم</th>
                <th>رقم الهاتف</th>
                <th>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  <td>{customer.customer_code || "-"}</td>
                  <td>{customer.full_name}</td>
                  <td>{customer.phone}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => startEditing(customer)}
                      style={{
                        ...buttonStyle,
                        background: colors.gold,
                        color: colors.white,
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
                        color: colors.white,
                      }}
                    >
                      سجل الحجوزات
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteCustomer(customer)}
                      style={{
                        ...buttonStyle,
                        background: colors.danger,
                        color: colors.white,
                      }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="4">لا توجد نتائج</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedCustomer && (
        <section style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <h2 style={{ color: colors.primary, margin: 0 }}>
              سجل حجوزات {selectedCustomer.full_name}
            </h2>

            <button
              type="button"
              onClick={() => {
                setSelectedCustomer(null);
                setCustomerBookings([]);
              }}
              style={{
                ...buttonStyle,
                background: "#eee",
                color: colors.text,
              }}
            >
              إغلاق السجل
            </button>
          </div>

          {bookingsLoading ? (
            <p>جارٍ تحميل سجل الحجوزات...</p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 15,
                  margin: "20px 0",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: 15,
                    background: colors.pink,
                    borderRadius: 12,
                  }}
                >
                  <strong>إجمالي الزيارات المكتملة</strong>
                  <h3>{completedBookings.length}</h3>
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: 15,
                    background: colors.pink,
                    borderRadius: 12,
                  }}
                >
                  <strong>إجمالي المبالغ المكتملة</strong>
                  <h3>{completedTotal.toFixed(2)} جنيه</h3>
                </div>
              </div>

              <h3 style={{ color: colors.primary }}>
                الخدمات الأكثر طلبًا
              </h3>

              {mostRequestedServices.length > 0 ? (
                <ul>
                  {mostRequestedServices.map(([serviceName, count]) => (
                    <li key={serviceName}>
                      {serviceName}: {count} مرة
                    </li>
                  ))}
                </ul>
              ) : (
                <p>لا توجد خدمات مكتملة حتى الآن</p>
              )}

              <h3 style={{ color: colors.primary }}>
                تفاصيل الحجوزات
              </h3>

              <div style={{ overflowX: "auto" }}>
                <table
                  width="100%"
                  cellPadding="10"
                  style={{
                    borderCollapse: "collapse",
                    textAlign: "center",
                    background: colors.white,
                  }}
                >
                  <thead style={{ background: colors.pink }}>
                    <tr>
                      <th>رقم الحجز</th>
                      <th>التاريخ</th>
                      <th>الوقت</th>
                      <th>الخدمات</th>
                      <th>الإجمالي</th>
                      <th>الحالة</th>
                      <th>الملاحظات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customerBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        style={{
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        <td>{booking.id}</td>
                        <td>{booking.booking_date || "-"}</td>
                        <td>{booking.booking_time || "-"}</td>
                        <td>
                          {booking.items.map((item, index) => (
                            <div key={index}>
                              {item.name} - {item.price.toFixed(2)} جنيه
                            </div>
                          ))}
                        </td>
                        <td>{booking.total.toFixed(2)} جنيه</td>
                        <td>{booking.status || "-"}</td>
                        <td>{booking.notes || "-"}</td>
                      </tr>
                    ))}

                    {customerBookings.length === 0 && (
                      <tr>
                        <td colSpan="7">
                          لا توجد حجوزات مسجلة لهذه العميلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  ...buttonStyle,
                  background: colors.gold,
                  color: colors.white,
                  marginTop: 20,
                }}
              >
                طباعة سجل الحجوزات
              </button>
            </>
          )}
        </section>
      )}
    </main>
  );
}
