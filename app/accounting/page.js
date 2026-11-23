
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

const paymentMethods = [
  { value: "cash", label: "كاش" },
  { value: "instapay", label: "إنستا باي" },
  { value: "vodafone_cash", label: "فودافون كاش" },
];

function getPaymentMethodLabel(value) {
  return (
    paymentMethods.find((method) => method.value === value)?.label ||
    "غير محدد"
  );
}

export default function AccountingPage() {
  const [expenses, setExpenses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [bookingServices, setBookingServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [revenues, setRevenues] = useState([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [paymentBookingId, setPaymentBookingId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(getToday());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reportDate, setReportDate] = useState(getToday());

  const [discountDrafts, setDiscountDrafts] = useState({});

  async function loadExpenses() {
    setLoading(true);
    setMessage("");

    const [
      expenseResult,
      bookingResult,
      serviceResult,
      bookingServicesResult,
      paymentResult,
      revenueResult,
    ] = await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false }),

      supabase
        .from("bookings")
        .select(
          "id, service_id, booking_date, booking_time, status, discount_amount"
        )
        .order("booking_date", { ascending: false }),

      supabase
        .from("services")
        .select("id, service_name, price"),

      supabase
        .from("booking_services")
        .select("booking_id, service_id, price"),

      supabase
        .from("booking_payments")
        .select(
          "id, booking_id, amount, payment_date, payment_method, notes, created_at"
        )
        .order("payment_date", { ascending: false }),

      supabase
        .from("booking_revenues")
        .select("id, booking_id, amount, revenue_date, created_at")
        .order("revenue_date", { ascending: false }),
    ]);

    setLoading(false);

    if (expenseResult.error) {
      setMessage("خطأ في تحميل المصروفات: " + expenseResult.error.message);
      return;
    }

    if (
      bookingResult.error ||
      serviceResult.error ||
      bookingServicesResult.error ||
      paymentResult.error ||
      revenueResult.error
    ) {
      setMessage(
        "خطأ في تحميل بيانات الحسابات: " +
          (
            bookingResult.error?.message ||
            serviceResult.error?.message ||
            bookingServicesResult.error?.message ||
            paymentResult.error?.message ||
            revenueResult.error?.message
          )
      );
      return;
    }

    setExpenses(expenseResult.data || []);
    setBookings(bookingResult.data || []);
    setServices(serviceResult.data || []);
    setBookingServices(bookingServicesResult.data || []);
    setPayments(paymentResult.data || []);
    setRevenues(revenueResult.data || []);

    const drafts = {};
    (bookingResult.data || []).forEach((booking) => {
      drafts[booking.id] = String(booking.discount_amount || 0);
    });
    setDiscountDrafts(drafts);
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
      setMessage("تعذر حذف المصروف: " + error.message);
      return;
    }

    setMessage("تم حذف المصروف بنجاح");
    await loadExpenses();
  }

  const getService = (serviceId) =>
    services.find(
      (item) => String(item.id) === String(serviceId)
    );

  const getBookingServiceItems = (booking) => {
    const items = bookingServices.filter(
      (item) => String(item.booking_id) === String(booking.id)
    );

    if (items.length === 0) {
      const service = getService(booking.service_id);

      if (!service) return [];

      return [
        {
          service_id: booking.service_id,
          price: service.price,
          service_name: service.service_name,
        },
      ];
    }

    return items.map((item) => {
      const service = getService(item.service_id);

      return {
        ...item,
        service_name:
          service?.service_name || `خدمة رقم ${item.service_id}`,
      };
    });
  };

  const getBookingTotal = (booking) =>
    getBookingServiceItems(booking).reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

  const getBookingPayments = (bookingId) =>
    payments.filter(
      (payment) => String(payment.booking_id) === String(bookingId)
    );

  const getBookingPaid = (bookingId) =>
    getBookingPayments(bookingId).reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

  const getBookingDiscount = (booking) =>
    Math.max(0, Number(booking.discount_amount || 0));

  const getBookingNet = (booking) =>
    Math.max(0, getBookingTotal(booking) - getBookingDiscount(booking));

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalRevenue = revenues.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalRemaining = bookings
    .filter((booking) => !["completed", "cancelled"].includes(booking.status || "pending"))
    .reduce((sum, booking) => sum + getBookingNet(booking), 0);

  const netProfit = totalRevenue - totalExpenses;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "completed"
  );

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

  // الإيرادات تُحسب حسب تاريخ اعتماد اكتمال الخدمة
  const reportRevenues = revenues.filter(
    (item) =>
      item.revenue_date >= reportStart &&
      item.revenue_date <= reportEnd
  );

  const reportTotalExpenses = reportExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const reportTotalRevenue = reportRevenues.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const reportNetProfit =
    reportTotalRevenue - reportTotalExpenses;

  async function saveDiscount(booking) {
    setMessage("");

    const discount = Number(discountDrafts[booking.id]);

    if (booking.status === "completed" || booking.status === "cancelled") {
      setMessage("لا يمكن تعديل خصم حجز مكتمل أو ملغي.");
      return;
    }

    if (!Number.isFinite(discount) || discount < 0) {
      setMessage("قيمة الخصم غير صحيحة");
      return;
    }

    const total = getBookingTotal(booking);

    if (discount > total) {
      setMessage("الخصم لا يمكن أن يكون أكبر من إجمالي الحجز");
      return;
    }

    const alreadyPaid = getBookingPaid(booking.id);
    const newNet = total - discount;

    if (alreadyPaid > newNet) {
      setMessage(
        "لا يمكن زيادة الخصم؛ لأن المبلغ المدفوع بالفعل أكبر من صافي الفاتورة الجديد"
      );
      return;
    }

    setSavingDiscount(true);

    const { error } = await supabase
      .from("bookings")
      .update({ discount_amount: discount })
      .eq("id", booking.id);

    setSavingDiscount(false);

    if (error) {
      setMessage("تعذر حفظ الخصم: " + error.message);
      return;
    }

    setMessage("تم حفظ الخصم بنجاح");
    await loadExpenses();
  }

  async function savePayment() {
    setMessage("");

    const booking = bookings.find(
      (item) => String(item.id) === String(paymentBookingId)
    );
    const amount = Number(paymentAmount);

    if (!booking || booking.status === "cancelled") {
      setMessage("اختاري حجزًا صالحًا لتسجيل الدفعة.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("أدخلي مبلغًا صحيحًا أكبر من صفر.");
      return;
    }

    if (!paymentDate) {
      setMessage("اختاري تاريخ التحصيل.");
      return;
    }

    const remaining = Math.max(
      0,
      getBookingNet(booking) - getBookingPaid(booking.id)
    );

    if (amount > remaining) {
      setMessage(`المبلغ أكبر من المتبقي على الحجز (${formatMoney(remaining)}).`);
      return;
    }

    setSavingPayment(true);
    const { error } = await supabase.from("booking_payments").insert({
      booking_id: booking.id,
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      notes: paymentNotes.trim() || null,
    });
    setSavingPayment(false);

    if (error) {
      setMessage("تعذر تسجيل الدفعة: " + error.message);
      return;
    }

    setPaymentAmount("");
    setPaymentNotes("");
    setMessage("تم تسجيل الدفعة بنجاح، ولم يتم اعتماد الإيراد بسبب تسجيل التحصيل فقط.");
    await loadExpenses();
  }

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

  const inputStyle = {
    width: "100%",
    padding: "11px",
    border: "1px solid #e7c8d6",
    borderRadius: "9px",
    fontSize: "14px",
    background: "white",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "750px",
  };

  const cellStyle = {
    padding: "13px 10px",
    borderBottom: "1px solid #f3e5eb",
    textAlign: "center",
    fontSize: "13px",
  };

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: "1250px",
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
          متابعة المقبوضات والمصروفات والخصومات والمتبقي
        </p>
      </header>

      {/* بطاقات الحسابات */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={{ ...cardStyle, borderTop: "5px solid #bd8b35" }}>
          <div style={{ color: "#8b6a2d" }}>إجمالي الإيرادات المعتمدة</div>
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
          <div style={{ color: "#397451" }}>صافي الإيرادات بعد المصروفات</div>
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
          <div style={{ color: "#80618f" }}>قيمة الحجوزات غير المكتملة</div>
          <h2 style={{ color: "#80618f", marginBottom: 0 }}>
            {formatMoney(totalRemaining)}
          </h2>
        </div>

        <div style={{ ...cardStyle, borderTop: "5px solid #548b70" }}>
          <div style={{ color: "#397451" }}>الحجوزات المكتملة</div>
          <h2 style={{ color: "#397451", marginBottom: 0 }}>
            {completedBookings.length}
          </h2>
        </div>
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
            lineHeight: 1.7,
          }}
        >
          {message}
        </div>
      )}

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
            onChange={(event) =>
              setReportDate(
                reportPeriod === "daily"
                  ? event.target.value
                  : `${event.target.value}-01`
              )
            }
            style={inputStyle}
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
            <div style={{ color: "#98702d" }}>المقبوضات خلال الفترة</div>
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
            <div style={{ color: "#397451" }}>
              صافي الإيرادات بعد المصروفات
            </div>
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
          عدد الخدمات المكتملة خلال الفترة: {reportRevenues.length}
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

      {/* تسجيل دفعة جديدة */}
      <section className="no-print" style={{ ...cardStyle, marginBottom: "28px" }}>
        <h2 style={{ color: "#922c5c", marginTop: 0 }}>
          تسجيل دفعة جديدة
        </h2>
        <p style={{ color: "#806b77", fontSize: "13px", lineHeight: 1.7 }}>
          سجلي المبلغ الذي تم تحصيله بالفعل واختاري وسيلة الدفع. تسجيل الدفعة لا يعتمد إيراد الحجز؛ اعتماد الإيراد يظل عند اكتمال الخدمة.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          alignItems: "end",
        }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>الحجز</label>
            <select
              value={paymentBookingId}
              onChange={(event) => setPaymentBookingId(event.target.value)}
              style={inputStyle}
            >
              <option value="">اختاري رقم الحجز</option>
              {bookings.filter((booking) => {
                if (booking.status === "cancelled") return false;
                return getBookingNet(booking) - getBookingPaid(booking.id) > 0;
              }).map((booking) => (
                <option key={booking.id} value={String(booking.id)}>
                  حجز #{booking.id} — {booking.booking_date} — متبقي {formatMoney(
                    Math.max(0, getBookingNet(booking) - getBookingPaid(booking.id))
                  )}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>المبلغ المحصّل</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)}
              placeholder="اكتبي المبلغ"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>طريقة الدفع</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              style={inputStyle}
            >
              <option value="cash">نقدًا (كاش)</option>
              <option value="instapay">إنستا باي</option>
              <option value="vodafone_cash">فودافون كاش</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>تاريخ التحصيل</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>ملاحظات (اختياري)</label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(event) => setPaymentNotes(event.target.value)}
              placeholder="ملاحظات عن الدفعة"
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            disabled={savingPayment}
            onClick={savePayment}
            style={{
              ...buttonStyle,
              background: "#922c5c",
              color: "white",
              opacity: savingPayment ? 0.6 : 1,
            }}
          >
            {savingPayment ? "جاري الحفظ..." : "تسجيل الدفعة"}
          </button>
        </div>
      </section>

      {/* سجل الإيرادات المعتمدة */}
      <section style={{ ...cardStyle, marginBottom: "28px" }}>
        <h2 style={{ color: "#922c5c", marginTop: 0 }}>
          سجل الإيرادات المعتمدة عند اكتمال الخدمة
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table className="accounting-table" style={tableStyle}>
            <thead style={{ background: "#f8e8ef" }}>
              <tr>
                <th style={cellStyle}>رقم الحجز</th>
                <th style={cellStyle}>قيمة الإيراد</th>
                <th style={cellStyle}>تاريخ الاعتماد</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((revenue) => (
                <tr key={revenue.id}>
                  <td style={cellStyle}>{revenue.booking_id}</td>
                  <td style={{ ...cellStyle, color: "#397451", fontWeight: "bold" }}>
                    {formatMoney(revenue.amount)}
                  </td>
                  <td style={cellStyle}>{revenue.revenue_date}</td>
                </tr>
              ))}
              {revenues.length === 0 && (
                <tr><td colSpan="3" style={cellStyle}>لا توجد إيرادات معتمدة حتى الآن</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p style={{ color: "#88727e", fontSize: "13px", marginBottom: 0 }}>
          كل حجز يظهر مرة واحدة فقط في سجل الإيرادات عند تحويل حالته إلى مكتمل.
        </p>
      </section>

      {/* سجل الحجوزات */}
      <section style={cardStyle}>
        <h2 style={{ color: "#922c5c", marginTop: 0 }}>
          سجل الحجوزات والفواتير
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
                  <th style={cellStyle}>الإجمالي</th>
                  <th style={cellStyle}>الخصم</th>
                  <th style={cellStyle}>صافي الفاتورة</th>
                  <th style={cellStyle}>الإيراد المعتمد</th>
                  <th className="no-print" style={cellStyle}>حفظ الخصم</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => {
                  const items = getBookingServiceItems(booking);
                  const total = getBookingTotal(booking);
                  const discount = getBookingDiscount(booking);
                  const net = getBookingNet(booking);
                  const recognizedRevenue = revenues.find(
                    (revenue) => String(revenue.booking_id) === String(booking.id)
                  );

                  return (
                    <tr key={booking.id}>
                      <td style={cellStyle}>
                        {booking.id}
                        <div style={{ color: "#88727e", fontSize: "11px" }}>
                          {booking.status === "completed"
                            ? "مكتمل"
                            : booking.status === "cancelled"
                              ? "ملغي"
                              : "غير مكتمل"}
                        </div>
                      </td>

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

                      <td style={cellStyle}>
                        {booking.booking_date}
                        <div>{booking.booking_time || "-"}</div>
                      </td>

                      <td style={cellStyle}>{formatMoney(total)}</td>

                      <td style={cellStyle}>
                        <input
                          className="no-print"
                          type="number"
                          min="0"
                          max={total}
                          step="0.01"
                          value={discountDrafts[booking.id] ?? "0"}
                          onChange={(event) =>
                            setDiscountDrafts((previous) => ({
                              ...previous,
                              [booking.id]: event.target.value,
                            }))
                          }
                          style={{
                            ...inputStyle,
                            width: "105px",
                            textAlign: "center",
                          }}
                        />
                        <span className="no-print" style={{ display: "none" }}>
                          {formatMoney(discount)}
                        </span>
                        <span style={{ display: "none" }} className="print-only">
                          {formatMoney(discount)}
                        </span>
                      </td>

                      <td style={cellStyle}>{formatMoney(net)}</td>

                      <td
                        style={{
                          ...cellStyle,
                          color: "#397451",
                          fontWeight: "bold",
                        }}
                      >
                        {recognizedRevenue ? formatMoney(recognizedRevenue.amount) : "—"}
                      </td>

                      <td className="no-print" style={cellStyle}>
                        <button
                          type="button"
                          disabled={savingDiscount}
                          onClick={() => saveDiscount(booking)}
                          style={{
                            ...buttonStyle,
                            background: "#922c5c",
                            color: "white",
                            padding: "8px 12px",
                            opacity: savingDiscount ? 0.6 : 1,
                          }}
                        >
                          حفظ
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {bookings.length === 0 && (
                  <tr>
                    <td colSpan="8" style={cellStyle}>
                      لا توجد حجوزات حتى الآن
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
            lineHeight: 1.8,
          }}
        >
          يتم اعتماد الإيراد مرة واحدة عند اكتمال الخدمة، ويُسجل بتاريخ
          الاعتماد. أما الدفعات المسجلة قبل تطبيق النظام الجديد فتظل محفوظة
          في السجل التاريخي ولا تُضاف مرة أخرى إلى إجمالي الإيرادات.
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
