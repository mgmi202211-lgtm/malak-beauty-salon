
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function getToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} جنيه`;
}

export default function AccountingPage() {
  const [expenses, setExpenses] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [bookingServices, setBookingServices] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reportDate, setReportDate] = useState(getToday());

  async function loadExpenses() {
    setLoading(true);
    setMessage("");

    const [
      expenseResult,
      bookingResult,
      serviceResult,
      bookingServicesResult,
    ] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false }),

      supabase
        .from("bookings")
        .select("id, service_id, booking_date, booking_time, status")
        .eq("status", "completed"),

      supabase
        .from("services")
        .select("id, service_name, price"),

      supabase
        .from("booking_services")
        .select("booking_id, service_id, price"),
    ]);

    setLoading(false);

    if (expenseResult.error) {
      setMessage(
        "خطأ في تحميل المصروفات: " + expenseResult.error.message
      );
      return;
    }

    if (
      bookingResult.error ||
      serviceResult.error ||
      bookingServicesResult.error
    ) {
      setMessage(
        "خطأ في تحميل الإيرادات: " +
          (
            bookingResult.error?.message ||
            serviceResult.error?.message ||
            bookingServicesResult.error?.message
          )
      );
      return;
    }

    setExpenses(expenseResult.data || []);
    setCompletedBookings(bookingResult.data || []);
    setServices(serviceResult.data || []);
    setBookingServices(bookingServicesResult.data || []);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function deleteExpense(id) {
    if (!window.confirm("هل تريد حذف هذا المصروف؟")) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("تعذر الحذف: " + error.message);
      return;
    }

    setMessage("تم حذف المصروف بنجاح");
    await loadExpenses();
  }

  const getService = (serviceId) =>
    services.find(
      (item) => String(item.id) === String(serviceId)
    );

  // جلب جميع خدمات الحجز وأسعارها المحفوظة وقت الفاتورة
  const getBookingServiceItems = (booking) => {
    const items = bookingServices.filter(
      (item) => String(item.booking_id) === String(booking.id)
    );

    // للحجوزات القديمة التي لا تحتوي على تفاصيل خدمات
    if (items.length === 0) {
      const service = getService(booking.service_id);

      if (!service) return [];

      return [
        {
          service_id: booking.service_id,
          price: service.price,
          service_name: service.service_name,
          fallback: true,
        },
      ];
    }

    return items.map((item) => {
      const service = getService(item.service_id);

      return {
        ...item,
        service_name:
          service?.service_name || `خدمة رقم ${item.service_id}`,
        fallback: false,
      };
    });
  };

  // إجمالي إيراد الحجز من جميع خدماته
  const getBookingTotal = (booking) =>
    getBookingServiceItems(booking).reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalRevenue = completedBookings.reduce(
    (sum, booking) => sum + getBookingTotal(booking),
    0
  );

  const netProfit = totalRevenue - totalExpenses;

  const reportStart =
    reportPeriod === "daily"
      ? reportDate
      : `${reportDate.slice(0, 7)}-01`;

  const reportEnd = (() => {
    if (reportPeriod === "daily") return reportDate;

    const year = Number(reportDate.slice(0, 4));
    const month = Number(reportDate.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();

    return `${reportDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  })();

  const reportExpenses = expenses.filter(
    (item) =>
      item.expense_date >= reportStart &&
      item.expense_date <= reportEnd
  );

  const reportBookings = completedBookings.filter(
    (item) =>
      item.booking_date >= reportStart &&
      item.booking_date <= reportEnd
  );

  const reportTotalExpenses = reportExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const reportTotalRevenue = reportBookings.reduce(
    (sum, booking) => sum + getBookingTotal(booking),
    0
  );

  const reportNetProfit =
    reportTotalRevenue - reportTotalExpenses;

  const cardStyle = {
    background: "#fff",
    border: "1px solid #f1dce5",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 5px 18px rgba(120, 40, 75, 0.06)",
  };

  const buttonStyle = {
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "650px",
  };

  const cellStyle = {
    padding: "14px 12px",
    borderBottom: "1px solid #f3e5eb",
    textAlign: "center",
    fontSize: "14px",
  };

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: "1200px",
        margin: "auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background: "#fffafd",
        minHeight: "100vh",
        color: "#422536",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .accounting-table tr:hover { background: #fff7fa; }
        .accounting-button:hover { opacity: .88; }
        @media print {
          .no-print { display: none !important; }
          main { max-width: 100% !important; padding: 5px !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* رأس الصفحة */}
      <header
        style={{
          background: "linear-gradient(135deg, #8f2855, #c46b91)",
          color: "white",
          padding: "30px 25px",
          borderRadius: "22px",
          marginBottom: "25px",
          boxShadow: "0 8px 25px rgba(143, 40, 85, .18)",
        }}
      >
        <div style={{ color: "#ffe4b5", fontSize: "14px" }}>
          MALAK BEAUTY SALON
        </div>

        <h1 style={{ margin: "10px 0", fontSize: "30px" }}>
          حسابات صالون ملك
        </h1>

        <p style={{ margin: 0, color: "#fff0f5" }}>
          متابعة الإيرادات والمصروفات والأرباح
        </p>
      </header>

      {/* بطاقات الحسابات */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={{ ...cardStyle, borderTop: "5px solid #bd8b35" }}>
          <div style={{ color: "#8b6a2d" }}>إجمالي الإيرادات</div>
          <h2 style={{ color: "#9b7025", marginBottom: 0 }}>
            {formatMoney(totalRevenue)}
          </h2>
        </div>

        <div style={{ ...cardStyle, borderTop: "5px solid #c46b91" }}>
          <div style={{ color: "#9d456d" }}>إجمالي المصروفات</div>
          <h2 style={{ color: "#a83e70", marginBottom: 0 }}>
            {formatMoney(totalExpenses)}
          </h2>
        </div>

        <div style={{ ...cardStyle, borderTop: "5px solid #548b70" }}>
          <div style={{ color: "#397451" }}>صافي الربح</div>
          <h2
            style={{
              color: netProfit >= 0 ? "#397451" : "#b42318",
              marginBottom: 0,
            }}
          >
            {formatMoney(netProfit)}
          </h2>
        </div>

        <div style={{ ...cardStyle, borderTop: "5px solid #80618f" }}>
          <div style={{ color: "#80618f" }}>الحجوزات المكتملة</div>
          <h2 style={{ color: "#80618f", marginBottom: 0 }}>
            {completedBookings.length}
          </h2>
        </div>
      </section>

      {/* إدارة المصروفات */}
      <section
        className="no-print"
        style={{
          ...cardStyle,
          marginBottom: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 7px" }}>إدارة المصروفات</h3>
          <span style={{ color: "#88727e", fontSize: "14px" }}>
            يمكنك تسجيل مصروف جديد من الصفحة المخصصة
          </span>
        </div>

        <a
          href="/expenses"
          className="accounting-button"
          style={{
            display: "inline-block",
            background: "#922c5c",
            color: "white",
            textDecoration: "none",
            padding: "13px 22px",
            borderRadius: "10px",
            fontWeight: "bold",
          }}
        >
          + إضافة مصروف جديد
        </a>
      </section>

      {message && (
        <div
          style={{
            background: "#fff0f4",
            border: "1px solid #efc4d5",
            color: "#922c5c",
            padding: "14px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          {message}
        </div>
      )}

      {/* التقارير */}
      <section style={{ ...cardStyle, marginBottom: "28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0, color: "#922c5c" }}>
            التقارير اليومية والشهرية
          </h2>

          <button
            type="button"
            className="no-print accounting-button"
            onClick={() => window.print()}
            style={{
              ...buttonStyle,
              background: "#bd8b35",
              color: "white",
            }}
          >
            طباعة التقرير / حفظ PDF
          </button>
        </div>

        <div
          className="no-print"
          style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
        >
          <button
            type="button"
            onClick={() => setReportPeriod("daily")}
            style={{
              ...buttonStyle,
              background:
                reportPeriod === "daily" ? "#922c5c" : "#f8e8ef",
              color: reportPeriod === "daily" ? "white" : "#922c5c",
            }}
          >
            تقرير يومي
          </button>

          <button
            type="button"
            onClick={() => setReportPeriod("monthly")}
            style={{
              ...buttonStyle,
              background:
                reportPeriod === "monthly" ? "#922c5c" : "#f8e8ef",
              color: reportPeriod === "monthly" ? "white" : "#922c5c",
            }}
          >
            تقرير شهري
          </button>
        </div>

        <div style={{ marginTop: "18px", maxWidth: "300px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>
            {reportPeriod === "daily" ? "اختر اليوم" : "اختر شهرًا"}
          </label>

          <input
            type={reportPeriod === "daily" ? "date" : "month"}
            value={
              reportPeriod === "daily"
                ? reportDate
                : reportDate.slice(0, 7)
            }
            onChange={(e) =>
              setReportDate(
                reportPeriod === "daily"
                  ? e.target.value
                  : `${e.target.value}-01`
              )
            }
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #e7c8d6",
              borderRadius: "10px",
              fontSize: "15px",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "14px",
            marginTop: "22px",
          }}
        >
          <div style={{ ...cardStyle, background: "#fffaf0" }}>
            <div style={{ color: "#98702d" }}>إيرادات الفترة</div>
            <h2 style={{ color: "#98702d" }}>
              {formatMoney(reportTotalRevenue)}
            </h2>
          </div>

          <div style={{ ...cardStyle, background: "#fff5f8" }}>
            <div style={{ color: "#a34770" }}>مصروفات الفترة</div>
            <h2 style={{ color: "#a34770" }}>
              {formatMoney(reportTotalExpenses)}
            </h2>
          </div>

          <div style={{ ...cardStyle, background: "#f3faf5" }}>
            <div style={{ color: "#397451" }}>صافي ربح الفترة</div>
            <h2
              style={{
                color: reportNetProfit >= 0 ? "#397451" : "#b42318",
              }}
            >
              {formatMoney(reportNetProfit)}
            </h2>
          </div>
        </div>

        <p style={{ marginBottom: 0, color: "#806b77" }}>
          عدد الحجوزات المكتملة: {reportBookings.length}
        </p>
      </section>

      {/* سجل المصروفات */}
      <section style={{ ...cardStyle, marginBottom: "28px" }}>
        <h2 style={{ color: "#922c5c", marginTop: 0 }}>
          سجل المصروفات
        </h2>

        {loading ? (
          <p>جاري تحميل المصروفات...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="accounting-table" style={tableStyle}>
              <thead style={{ background: "#f8e8ef" }}>
                <tr>
                  <th style={cellStyle}>المصروف</th>
                  <th style={cellStyle}>المبلغ</th>
                  <th style={cellStyle}>التاريخ</th>
                  <th style={cellStyle}>ملاحظات</th>
                  <th className="no-print" style={cellStyle}>الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>{item.expense_name}</td>
                    <td
                      style={{
                        ...cellStyle,
                        color: "#a34770",
                        fontWeight: "bold",
                      }}
                    >
                      {formatMoney(item.amount)}
                    </td>
                    <td style={cellStyle}>{item.expense_date}</td>
                    <td style={cellStyle}>{item.notes || "-"}</td>
                    <td className="no-print" style={cellStyle}>
                      <button
                        type="button"
                        className="accounting-button"
                        onClick={() => deleteExpense(item.id)}
                        style={{
                          ...buttonStyle,
                          background: "#fff0f0",
                          color: "#b42318",
                          padding: "8px 15px",
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}

                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="5" style={cellStyle}>
                      لا توجد مصروفات حتى الآن
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* سجل الحجوزات */}
      <section style={cardStyle}>
        <h2 style={{ color: "#922c5c", marginTop: 0 }}>
          سجل الحجوزات المكتملة والإيرادات
        </h2>

        {loading ? (
          <p>جاري تحميل الحجوزات...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="accounting-table" style={tableStyle}>
              <thead style={{ background: "#f8e8ef" }}>
                <tr>
                  <th style={cellStyle}>رقم الحجز</th>
                  <th style={cellStyle}>الخدمات وأسعارها</th>
                  <th style={cellStyle}>التاريخ</th>
                  <th style={cellStyle}>الوقت</th>
                  <th style={cellStyle}>إجمالي الإيراد</th>
                </tr>
              </thead>

              <tbody>
                {completedBookings.map((booking) => {
                  const items = getBookingServiceItems(booking);
                  const bookingTotal = getBookingTotal(booking);

                  return (
                    <tr key={booking.id}>
                      <td style={cellStyle}>{booking.id}</td>

                      <td style={cellStyle}>
                        {items.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "7px",
                              alignItems: "center",
                            }}
                          >
                            {items.map((item, index) => (
                              <div
                                key={`${item.service_id}-${index}`}
                                style={{
                                  borderBottom:
                                    index < items.length - 1
                                      ? "1px solid #f3e5eb"
                                      : "none",
                                  paddingBottom: "5px",
                                }}
                              >
                                <div>{item.service_name}</div>
                                <small style={{ color: "#88727e" }}>
                                  {formatMoney(item.price)}
                                </small>
                              </div>
                            ))}
                          </div>
                        ) : (
                          "لا توجد تفاصيل خدمات"
                        )}
                      </td>

                      <td style={cellStyle}>{booking.booking_date}</td>

                      <td style={cellStyle}>
                        {booking.booking_time || "-"}
                      </td>

                      <td
                        style={{
                          ...cellStyle,
                          color: "#397451",
                          fontWeight: "bold",
                        }}
                      >
                        {formatMoney(bookingTotal)}
                      </td>
                    </tr>
                  );
                })}

                {completedBookings.length === 0 && (
                  <tr>
                    <td colSpan="5" style={cellStyle}>
                      لا توجد حجوزات مكتملة حتى الآن
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p
          style={{
            color: "#88727e",
            marginTop: "20px",
            fontSize: "13px",
          }}
        >
          ملاحظة: يتم احتساب إيرادات كل حجز من أسعار الخدمات المحفوظة
          وقت إنشاء الفاتورة. وفي حالة الحجوزات القديمة التي لا تحتوي
          على تفاصيل خدمات محفوظة، يتم استخدام سعر الخدمة الأساسية
          الحالي كحل احتياطي. يتم احتساب الحجوزات المكتملة فقط.
        </p>
      </section>

      <div
        className="no-print"
        style={{ textAlign: "center", margin: "25px 0" }}
      >
        <a href="/" style={{ color: "#922c5c", fontWeight: "bold" }}>
          العودة إلى الصفحة الرئيسية
        </a>
      </div>
    </main>
  );
}
