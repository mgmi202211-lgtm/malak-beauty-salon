"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import AuthGuard, { useSalonRole } from "./components/AuthGuard";
import BackupButton from "./components/BackupButton";

// تحويل الأرقام العربية إلى إنجليزية وتنظيف رقم الهاتف
function normalizePhone(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/\D/g, "");
}

const todayDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const money = (value) =>
  Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  }) + " جنيه";

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  border: "1px solid #e7cfda",
  borderRadius: "10px",
  background: "#fff",
  color: "#422536",
  fontSize: "15px",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#6e4056",
  fontWeight: "bold",
  fontSize: "14px",
};

function Dashboard() {
  const router = useRouter();
  const { role } = useSalonRole();

  const [stats, setStats] = useState({
    customers: 0,
    bookings: 0,
    revenue: 0,
    expenses: 0,
    profit: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // بيانات شاشة الاستقبال
  const [services, setServices] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const customerPhoneRef = useRef("");
  const [customerFound, setCustomerFound] = useState(null);
  const [customerMessage, setCustomerMessage] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceToAdd, setServiceToAdd] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceResultsOpen, setServiceResultsOpen] = useState(false);
  const servicePickerRef = useRef(null);

  const [bookingDate, setBookingDate] = useState(todayDate());
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");

  // بيانات الخصم والتحصيل
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  const today = todayDate();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("تعذر تسجيل الخروج: " + error.message);
      return;
    }

    router.replace("/login");
  }

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("service_name");

    if (error) {
      console.error("Services Error:", error);
      setFormError("تعذر تحميل الخدمات: " + error.message);
      return;
    }

    setServices(data || []);
  }

  async function loadDashboard({ showLoading = true } = {}) {
    if (showLoading) setLoading(true);
    setErrorMessage("");

    try {
      const [
        customersResult,
        bookingsResult,
        servicesResult,
        expensesResult,
        bookingServicesResult,
        paymentsResult,
        revenuesResult,
      ] = await Promise.all([
        supabase.from("customers").select("*"),
        supabase.from("bookings").select("*"),
        supabase.from("services").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("booking_services").select("*"),
        supabase.from("booking_payments").select("*"),
        supabase.from("booking_revenues").select("*"),
      ]);

      const error =
        customersResult.error ||
        bookingsResult.error ||
        servicesResult.error ||
        expensesResult.error ||
        bookingServicesResult.error ||
        paymentsResult.error ||
        revenuesResult.error;

      if (error) throw error;

      const customers = customersResult.data || [];
      const bookings = bookingsResult.data || [];
      const allServices = servicesResult.data || [];
      const expenses = expensesResult.data || [];
      const bookingServices = bookingServicesResult.data || [];
      const payments = paymentsResult.data || [];
      const revenues = revenuesResult.data || [];

      const customersById = new Map(
        customers.map((customer) => [
          String(customer.id),
          customer,
        ])
      );

      const servicesById = new Map(
        allServices.map((service) => [
          String(service.id),
          service,
        ])
      );

      const bookingServicesByBookingId = new Map();

      bookingServices.forEach((item) => {
        const bookingId = String(item.booking_id);

        if (!bookingServicesByBookingId.has(bookingId)) {
          bookingServicesByBookingId.set(bookingId, []);
        }

        bookingServicesByBookingId.get(bookingId).push(item);
      });

      const paymentsByBookingId = new Map();

      payments.forEach((payment) => {
        const bookingId = String(payment.booking_id);

        if (!paymentsByBookingId.has(bookingId)) {
          paymentsByBookingId.set(bookingId, 0);
        }

        paymentsByBookingId.set(
          bookingId,
          paymentsByBookingId.get(bookingId) +
            Number(payment.amount || 0)
        );
      });

      const todayBookings = bookings.filter(
        (booking) => booking.booking_date === today
      );

      const todayExpenses = expenses
        .filter((expense) => expense.expense_date === today)
        .reduce(
          (sum, expense) => sum + Number(expense.amount || 0),
          0
        );

      // الإيراد يُعتمد مرة واحدة عند اكتمال الخدمة
      const todayRevenue = revenues
        .filter((revenue) => revenue.revenue_date === today)
        .reduce(
          (sum, revenue) => sum + Number(revenue.amount || 0),
          0
        );

      setStats({
        customers: customers.length,
        bookings: bookings.length,
        revenue: todayRevenue,
        expenses: todayExpenses,
        profit: todayRevenue - todayExpenses,
      });

      // تجهيز أحدث خمسة حجوزات غير مكتملة
      const latest = [...bookings]
        .filter((booking) => booking.status !== "completed" && booking.status !== "cancelled")
        .sort((a, b) =>
          `${b.booking_date} ${b.booking_time || ""}`.localeCompare(
            `${a.booking_date} ${a.booking_time || ""}`
          )
        )
        .slice(0, 5)
        .map((booking) => {
          const customer = customersById.get(
            String(booking.customer_id)
          );

          const savedServices =
            bookingServicesByBookingId.get(String(booking.id)) || [];

          const serviceNames = [];
          let bookingTotal = 0;

          if (savedServices.length > 0) {
            savedServices.forEach((item) => {
              const service = servicesById.get(
                String(item.service_id)
              );

              serviceNames.push(
                service?.service_name ||
                  `خدمة رقم ${item.service_id}`
              );

              bookingTotal += Number(item.price || 0);
            });
          } else {
            const service = servicesById.get(
              String(booking.service_id)
            );

            serviceNames.push(
              service?.service_name || "غير معروف"
            );

            bookingTotal = Number(service?.price || 0);
          }

          const discount = Number(booking.discount_amount || 0);
          const netTotal = Math.max(0, bookingTotal - discount);
          const paid = paymentsByBookingId.get(String(booking.id)) || 0;

          return {
            ...booking,
            customerName: customer?.full_name || "غير معروف",
            serviceName: serviceNames.join("، "),
            bookingTotal,
            discount,
            netTotal,
            paid,
            remaining: Math.max(0, netTotal - paid),
          };
        });

      setRecentBookings(latest);
    } catch (error) {
      console.error("Dashboard Error:", error);
      setErrorMessage(
        "تعذر تحميل بيانات لوحة التحكم: " + error.message
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    loadServices();
  }, []);

  // إغلاق قائمة الخدمات عند الضغط أو اللمس خارجها
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        servicePickerRef.current &&
        !servicePickerRef.current.contains(event.target)
      ) {
        setServiceResultsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // البحث عن العميلة برقم الهاتف
  async function findCustomer(phoneValue = customerPhone) {
    const phone = normalizePhone(phoneValue);

    setFormError("");
    setFormMessage("");
    setCustomerFound(null);
    setCustomerName("");
    setCustomerMessage("");

    if (phone.length !== 11) {
      return;
    }

    setCustomerMessage("جاري البحث عن العميلة...");

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .limit(2);

    if (customerPhoneRef.current !== phone) {
      return;
    }

    if (error) {
      setCustomerMessage("");
      setFormError("تعذر البحث عن العميلة: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      const customer = data[0];

      setCustomerFound(customer);
      setCustomerName(customer.full_name || "");

      setCustomerMessage(
        data.length > 1
          ? "تم العثور على أكثر من سجل بنفس الرقم، سيتم استخدام أول سجل."
          : "تم العثور على العميلة المسجلة."
      );
    } else {
      setCustomerFound(null);
      setCustomerName("");
      setCustomerMessage(
        "رقم جديد — اكتبي اسم العميلة وسيتم تسجيلها عند حفظ الفاتورة."
      );
    }
  }

  // البحث التلقائي بعد إدخال رقم الهاتف
  useEffect(() => {
    const phone = normalizePhone(customerPhone);

    if (phone.length !== 11) return;

    const timer = setTimeout(() => {
      findCustomer(phone);
    }, 400);

    return () => clearTimeout(timer);
  }, [customerPhone]);

  function addService() {
    setFormError("");
    setFormMessage("");

    if (!serviceToAdd) {
      setFormError("اختاري خدمة أولاً");
      return;
    }

    const service = services.find(
      (item) => String(item.id) === String(serviceToAdd)
    );

    if (!service) {
      setFormError("الخدمة المختارة غير موجودة");
      return;
    }

    const alreadyAdded = selectedServices.some(
      (item) => String(item.id) === String(service.id)
    );

    if (alreadyAdded) {
      setFormError("الخدمة موجودة بالفعل في الفاتورة");
      return;
    }

    setSelectedServices((prev) => [
      ...prev,
      {
        id: service.id,
        service_name: service.service_name,
        price: Number(service.price || 0),
      },
    ]);

    setServiceToAdd("");
    setServiceSearch("");
    setServiceResultsOpen(false);
  }

  function removeService(serviceId) {
    setSelectedServices((prev) =>
      prev.filter((item) => String(item.id) !== String(serviceId))
    );
  }

  const invoiceTotal = selectedServices.reduce(
    (sum, service) => sum + Number(service.price || 0),
    0
  );

  const discountValue = Math.max(0, Number(discountAmount || 0));
  const netInvoiceTotal = Math.max(0, invoiceTotal - discountValue);
  const filteredServices = services.filter((service) =>
    String(service.service_name || "")
      .toLowerCase()
      .includes(serviceSearch.trim().toLowerCase())
  );

  // تجهيز نموذج فاتورة جديدة
  function resetInvoiceForm() {
    setCustomerName("");
    setCustomerPhone("");
    customerPhoneRef.current = "";
    setCustomerFound(null);
    setCustomerMessage("");
    setSelectedServices([]);
    setServiceToAdd("");
    setServiceSearch("");
    setServiceResultsOpen(false);
    setBookingDate(todayDate());
    setBookingTime("");
    setNotes("");
    setDiscountAmount("0");
    setPaymentMethod("cash");
  }

  // حفظ الفاتورة وتسجيل تحصيل قيمتها بطريقة الدفع المختارة
  async function saveInvoice(event) {
    event.preventDefault();

    setFormError("");
    setFormMessage("");

    const name = customerName.trim();
    const phone = normalizePhone(customerPhone);

    const discount = Number(discountAmount || 0);
    const netTotal = invoiceTotal - discount;

    if (!phone) {
      setFormError("اكتبي رقم هاتف العميلة");
      return;
    }

    if (phone.length !== 11) {
      setFormError("رقم الهاتف يجب أن يتكون من 11 رقمًا");
      return;
    }

    if (selectedServices.length === 0) {
      setFormError("أضيفي خدمة واحدة على الأقل للفاتورة");
      return;
    }

    if (!Number.isFinite(discount) || discount < 0) {
      setFormError("قيمة الخصم غير صحيحة");
      return;
    }

    if (discount > invoiceTotal) {
      setFormError("الخصم لا يمكن أن يكون أكبر من إجمالي الخدمات");
      return;
    }

    try {
      setSaving(true);

      let customer = customerFound;

      const { data: existingCustomers, error: searchError } =
        await supabase
          .from("customers")
          .select("*")
          .eq("phone", phone)
          .limit(2);

      if (searchError) throw searchError;

      if (existingCustomers && existingCustomers.length > 0) {
        customer = existingCustomers[0];
      } else {
        if (!name) {
          setFormError("اكتبي اسم العميلة الجديدة");
          return;
        }

        const { data: newCustomer, error: customerError } =
          await supabase
            .from("customers")
            .insert({
              full_name: name,
              phone: phone,
            })
            .select()
            .single();

        if (customerError) throw customerError;

        customer = newCustomer;
      }

      // إنشاء الحجز وحفظ الخصم
      const { data: newBooking, error: bookingError } =
        await supabase
          .from("bookings")
          .insert({
            customer_id: customer.id,
            service_id: selectedServices[0].id,
            booking_date: bookingDate || todayDate(),
            booking_time:
              bookingTime || new Date().toTimeString().slice(0, 8),
            status: "pending",
            notes: notes.trim(),
            discount_amount: discount,
          })
          .select()
          .single();

      if (bookingError) throw bookingError;

      // حفظ جميع خدمات الفاتورة بالأسعار وقت الحجز
      const rows = selectedServices.map((service) => ({
        booking_id: newBooking.id,
        service_id: service.id,
        price: service.price,
      }));

      const { error: servicesError } = await supabase
        .from("booking_services")
        .insert(rows);

      if (servicesError) {
        // محاولة حذف الحجز إذا فشل حفظ الخدمات
        await supabase.from("bookings").delete().eq("id", newBooking.id);
        throw servicesError;
      }

      // تسجيل تحصيل صافي الفاتورة مرة واحدة عند حفظها
      if (netTotal > 0) {
        const { error: paymentError } = await supabase
          .from("booking_payments")
          .insert({
            booking_id: newBooking.id,
            amount: netTotal,
            payment_method: paymentMethod,
            payment_date: todayDate(),
            notes: "تحصيل الفاتورة عند إنشائها",
          });

        if (paymentError) {
          await supabase.from("booking_services").delete().eq("booking_id", newBooking.id);
          await supabase.from("bookings").delete().eq("id", newBooking.id);
          throw paymentError;
        }
      }

      setFormMessage(
        `تم حفظ الفاتورة بنجاح — رقم الحجز: ${newBooking.id}. ` +
          `صافي الفاتورة: ${money(netTotal)}. ` +
          `طريقة الدفع: ${paymentMethod === "cash" ? "كاش" : paymentMethod === "instapay" ? "إنستا باي" : "فودافون كاش"}. ` +
          "سيتم اعتماد الإيراد عند اكتمال الخدمة."
      );

      resetInvoiceForm();

      await loadDashboard({ showLoading: false });
    } catch (error) {
      console.error("Save Invoice Error:", error);
      setFormError("تعذر حفظ الفاتورة: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  const cards = [
    {
      title: "عدد العميلات",
      value: stats.customers,
      color: "#d6ad69",
      icon: "👩",
    },
    {
      title: "إجمالي الحجوزات",
      value: stats.bookings,
      color: "#b98aa9",
      icon: "📅",
    },
    {
      title: "إيراد اليوم",
      value: money(stats.revenue),
      color: "#65a786",
      icon: "💰",
    },
    {
      title: "مصروفات اليوم",
      value: money(stats.expenses),
      color: "#d8798c",
      icon: "🧾",
    },
    {
      title: "صافي اليوم",
      value: money(stats.profit),
      color: "#d6ad69",
      icon: "✨",
    },
  ];

  const links = [
    {
      title: "إدارة العميلات",
      description: "إضافة وتعديل بيانات العميلات",
      href: "/customers",
      icon: "👩‍💼",
    },
    {
      title: "الخدمات والأسعار",
      description: "إدارة خدمات الصالون وأسعارها",
      href: "/services",
      icon: "💇‍♀️",
    },
    {
      title: "إدارة الحجوزات",
      description: "متابعة المواعيد وحالات الحجز",
      href: "/bookings",
      icon: "📅",
    },
    {
      title: "الحسابات والتقارير",
      description: "الإيرادات والمصروفات والأرباح",
      href: "/accounting",
      icon: "📊",
    },
    {
      title: "إضافة مصروف",
      description: "تسجيل مصروف جديد",
      href: "/expenses",
      icon: "➕",
    },
  ];

  const statusInfo = {
    pending: {
      label: "جديد",
      color: "#d6ad69",
      background: "#fff5df",
    },
    completed: {
      label: "مكتمل",
      color: "#397451",
      background: "#e8f7ed",
    },
    cancelled: {
      label: "ملغي",
      color: "#ad3545",
      background: "#ffebee",
    },
  };

  const sectionStyle = {
    background: "#fff",
    border: "1px solid #ead9e2",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 5px 18px rgba(50, 20, 40, .12)",
  };

  return (
    <main
      className="dashboard-main"
      dir="rtl"
      style={{
        maxWidth: "1300px",
        width: "100%",
        margin: "auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        background: "#211722",
        minHeight: "100vh",
        color: "#f8edf3",
      }}
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          max-width: 100%;
          overflow-x: hidden;
        }

        .dashboard-main {
          width: 100%;
          min-width: 0;
        }

        .dashboard-main button,
        .dashboard-main input,
        .dashboard-main select,
        .dashboard-main textarea {
          max-width: 100%;
          font-family: Arial, sans-serif;
        }

        .dashboard-link {
          transition: transform .2s, box-shadow .2s;
        }

        .dashboard-link:hover {
          transform: translateY(-4px);
          box-shadow: 0 9px 22px rgba(0,0,0,.25);
        }

        .dashboard-table tr:hover {
          background: #fff7fa;
        }

        .gold-button {
          background: linear-gradient(135deg,#e6c58c,#b88b4a);
          color: #382333;
          border: none;
          border-radius: 10px;
          padding: 12px 19px;
          font-weight: bold;
          cursor: pointer;
          white-space: nowrap;
        }

        .dark-button {
          background: #51374c;
          color: white;
          border: 1px solid #80617a;
          border-radius: 10px;
          padding: 11px 16px;
          cursor: pointer;
        }

        .dashboard-table-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .dashboard-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(195px,1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .dashboard-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit,minmax(190px,1fr));
          gap: 15px;
        }

        .dashboard-section {
          min-width: 0;
        }

        .invoice-grid {
          min-width: 0;
        }

        .invoice-grid > * {
          min-width: 0;
        }

        .invoice-phone-row {
          display: flex;
          gap: 8px;
          width: 100%;
        }

        .invoice-phone-row input {
          min-width: 0;
          flex: 1;
        }

        @media (max-width: 600px) {
          .dashboard-main {
            padding: 12px !important;
          }

          .dashboard-header {
            padding: 18px !important;
            border-radius: 16px !important;
            margin-bottom: 18px !important;
          }

          .dashboard-header h1 {
            font-size: 25px !important;
            line-height: 1.5;
          }

          .dashboard-header p {
            line-height: 1.8;
            font-size: 13px;
          }

          .dashboard-header > div:first-child {
            font-size: 12px !important;
          }

          .dashboard-header button {
            flex: 1 1 140px;
            min-height: 44px;
          }

          .dashboard-section {
            padding: 15px !important;
            border-radius: 14px !important;
          }

          .invoice-grid {
            grid-template-columns: minmax(0,1fr) !important;
            gap: 14px !important;
          }

          .invoice-grid > * {
            width: 100%;
            min-width: 0;
          }

          .invoice-grid button {
            width: 100%;
            min-height: 44px;
          }

          .invoice-phone-row {
            flex-wrap: wrap;
          }

          .invoice-phone-row input {
            flex: 1 1 100%;
          }

          .invoice-phone-row button {
            flex: 1 1 100%;
          }

          .dashboard-card-grid {
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 10px !important;
          }

          .dashboard-card-grid > div {
            min-width: 0;
            padding: 14px !important;
            border-radius: 13px !important;
          }

          .dashboard-card-grid h2 {
            font-size: 18px !important;
            line-height: 1.6;
          }

          .dashboard-card-grid span {
            font-size: 12px !important;
          }

          .dashboard-links-grid {
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 10px !important;
          }

          .dashboard-link {
            min-width: 0;
            padding: 15px !important;
            border-radius: 13px !important;
          }

          .dashboard-link h3 {
            font-size: 14px !important;
            line-height: 1.6;
          }

          .dashboard-link p {
            font-size: 12px !important;
          }

          .dashboard-link > div {
            font-size: 25px !important;
          }

          .dashboard-main input,
          .dashboard-main select,
          .dashboard-main textarea {
            font-size: 16px !important;
            min-height: 44px;
          }

          .dashboard-main button {
            min-height: 44px;
          }

          .dashboard-main textarea {
            min-height: 85px;
          }

          .dashboard-table-wrap {
            border-radius: 8px;
          }

          .dashboard-main h2 {
            line-height: 1.5;
          }
        }

        @media (max-width: 380px) {
          .dashboard-card-grid,
          .dashboard-links-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-header h1 {
            font-size: 22px !important;
          }

          .dashboard-header {
            padding: 15px !important;
          }
        }
      
        /* تحسين وضوح الخط على الموبايل والكمبيوتر */
        .dashboard-main { font-size: 18px !important; line-height: 1.85 !important; }
        .dashboard-main p, .dashboard-main label { font-size: 17px !important; line-height: 1.9 !important; }
        .dashboard-main button, .dashboard-main input, .dashboard-main select, .dashboard-main textarea {
          font-size: 17px !important; min-height: 48px !important;
        }
        .dashboard-main h2 { font-size: 25px !important; line-height: 1.55 !important; }
        .dashboard-main h3 { font-size: 20px !important; line-height: 1.6 !important; }
        .dashboard-main table th, .dashboard-main table td { font-size: 16px !important; line-height: 1.75 !important; }
        .dashboard-main small { font-size: 14px !important; line-height: 1.7 !important; }
        @media (max-width: 600px) {
          .dashboard-main { font-size: 17px !important; line-height: 1.85 !important; }
          .dashboard-main p, .dashboard-main label { font-size: 16px !important; }
          .dashboard-main button, .dashboard-main input, .dashboard-main select, .dashboard-main textarea {
            font-size: 16px !important; min-height: 48px !important;
          }
          .dashboard-main h2 { font-size: 22px !important; }
          .dashboard-main h3 { font-size: 18px !important; }
          .dashboard-main table th, .dashboard-main table td { font-size: 15px !important; }
          .dashboard-header p { font-size: 15px !important; }
          .dashboard-header > div:first-child { font-size: 13px !important; }
          .dashboard-card-grid span { font-size: 14px !important; }
          .dashboard-link h3 { font-size: 16px !important; }
          .dashboard-link p { font-size: 14px !important; }
        }
`}</style>

      {/* رأس الصفحة */}
      <header
        className="dashboard-header"
        style={{
          background: "linear-gradient(135deg,#382337,#70445f)",
          border: "1px solid #a98662",
          color: "white",
          padding: "32px",
          borderRadius: "22px",
          marginBottom: "25px",
          boxShadow: "0 8px 25px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            color: "#e6c58c",
            fontSize: "14px",
            letterSpacing: "2px",
          }}
        >
          MALAK BEAUTY SALON
        </div>

        <h1 style={{ fontSize: "32px", margin: "12px 0" }}>
          صالون ملك للتجميل
        </h1>

        <p style={{ color: "#eadce5", margin: 0 }}>
          نظام استقبال العميلات وإدارة الصالون
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "22px",
          }}
        >
          <span
            style={{
              background: "#ffffff18",
              border: "1px solid #ffffff40",
              borderRadius: "9px",
              padding: "9px 13px",
              fontSize: "13px",
            }}
          >
            📅 {today}
          </span>

          <button
            type="button"
            onClick={() => {
              loadDashboard();
              loadServices();
            }}
            disabled={loading}
            className="gold-button"
          >
            {loading ? "جاري التحديث..." : "↻ تحديث البيانات"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "#fff",
              color: "#59344e",
              border: "none",
              borderRadius: "9px",
              padding: "11px 17px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      {errorMessage && (
        <div
          style={{
            background: "#fff0f0",
            color: "#a12635",
            border: "1px solid #f2c5cb",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "20px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* شاشة استقبال العميلة */}
      <section
        className="dashboard-section"
        style={{
          ...sectionStyle,
          background: "linear-gradient(145deg,#352638,#29202e)",
          border: "1px solid #a98662",
          marginBottom: "30px",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <div>
            <div
              style={{
                color: "#e6c58c",
                fontSize: "13px",
                letterSpacing: "1px",
              }}
            >
              CUSTOMER RECEPTION
            </div>

            <h2 style={{ margin: "8px 0", color: "#f0d6a8" }}>
              استقبال عميلة جديدة
            </h2>

            <p style={{ color: "#d6c5d1", margin: 0, fontSize: "13px" }}>
              تسجيل بيانات العميلة وإعداد فاتورة الخدمات
            </p>
          </div>

          <span
            style={{
              border: "1px solid #b88b4a",
              color: "#e6c58c",
              padding: "9px 15px",
              borderRadius: "30px",
              fontSize: "13px",
            }}
          >
            فاتورة جديدة
          </span>
        </div>

        <form onSubmit={saveInvoice}>
          <div
            className="invoice-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>رقم هاتف العميلة</label>

              <div className="invoice-phone-row">
                <input
                  style={inputStyle}
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={customerPhone}
                  onChange={(e) => {
                    const value = normalizePhone(e.target.value);

                    customerPhoneRef.current = value;
                    setCustomerPhone(value);
                    setCustomerName("");
                    setCustomerFound(null);
                    setCustomerMessage("");
                    setFormError("");
                    setFormMessage("");
                  }}
                  placeholder="أدخلي رقم الهاتف"
                  required
                />

                <button
                  type="button"
                  className="gold-button"
                  onClick={() => findCustomer(customerPhone)}
                >
                  بحث
                </button>
              </div>

              {customerMessage && (
                <p style={{ color: "#e6c58c", fontSize: "13px" }}>
                  {customerMessage}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>اسم العميلة</label>

              <input
                style={inputStyle}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسم العميلة بالكامل"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>تاريخ الموعد (اختياري)</label>

              <input
                style={inputStyle}
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>وقت الموعد (اختياري)</label>

              <input
                style={inputStyle}
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #60495d",
              margin: "25px 0",
              paddingTop: "22px",
            }}
          >
            <h3 style={{ color: "#e6c58c", marginTop: 0 }}>
              اختيار خدمات الفاتورة
            </h3>

            <div
              className="invoice-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "10px",
                alignItems: "end",
              }}
            >
              <div
                ref={servicePickerRef}
                style={{ position: "relative" }}
              >
                <label style={labelStyle}>الخدمات المتاحة</label>

                <input
                  style={inputStyle}
                  type="search"
                  value={serviceSearch}
                  onFocus={() => setServiceResultsOpen(true)}
                  onChange={(e) => {
                    setServiceSearch(e.target.value);
                    setServiceToAdd("");
                    setServiceResultsOpen(true);
                  }}
                  placeholder="ابحثي عن الخدمة المطلوبة..."
                />

                {serviceResultsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      left: 0,
                      zIndex: 100,
                      background: "#fff",
                      border: "1px solid #e7cfda",
                      borderRadius: "10px",
                      marginTop: "5px",
                      maxHeight: "230px",
                      overflowY: "auto",
                      boxShadow: "0 8px 20px rgba(0,0,0,.2)",
                    }}
                  >
                    {filteredServices.length > 0 ? (
                      filteredServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setServiceToAdd(String(service.id));
                            setServiceSearch(service.service_name);
                            setServiceResultsOpen(false);
                          }}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                            width: "100%",
                            padding: "13px",
                            border: "none",
                            borderBottom: "1px solid #f0e4ea",
                            background:
                              String(service.id) === String(serviceToAdd)
                                ? "#f8edf3"
                                : "#fff",
                            color: "#422536",
                            textAlign: "right",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          <span>{service.service_name}</span>
                          <strong
                            style={{
                              color: "#8d5d32",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {money(service.price)}
                          </strong>
                        </button>
                      ))
                    ) : (
                      <p
                        style={{
                          color: "#927d89",
                          padding: "12px",
                          margin: 0,
                          textAlign: "center",
                        }}
                      >
                        لا توجد خدمات مطابقة للبحث
                      </p>
                    )}
                  </div>
                )}

                {serviceToAdd && (
                  <p style={{ color: "#e6c58c", fontSize: "13px" }}>
                    تم اختيار الخدمة: {serviceSearch}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="gold-button"
                onClick={addService}
              >
                + إضافة خدمة
              </button>
            </div>
          </div>

          {/* تفاصيل الفاتورة */}
          <div
            style={{
              background: "#fff",
              color: "#422536",
              borderRadius: "14px",
              padding: "18px",
              marginBottom: "20px",
              minWidth: 0,
            }}
          >
            <h3
              style={{
                color: "#79445f",
                marginTop: 0,
                paddingBottom: "12px",
                borderBottom: "1px solid #ead9e2",
              }}
            >
              تفاصيل الفاتورة
            </h3>

            {selectedServices.length === 0 ? (
              <p style={{ color: "#9a8290", textAlign: "center" }}>
                لم تتم إضافة خدمات بعد
              </p>
            ) : (
              <div className="dashboard-table-wrap">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "right",
                    minWidth: "350px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8edf3" }}>
                      <th style={{ padding: "12px" }}>الخدمة</th>
                      <th style={{ padding: "12px" }}>السعر</th>
                      <th style={{ padding: "12px" }}>إزالة</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedServices.map((service) => (
                      <tr key={service.id}>
                        <td
                          style={{
                            padding: "13px 12px",
                            borderBottom: "1px solid #f0e4ea",
                          }}
                        >
                          {service.service_name}
                        </td>

                        <td
                          style={{
                            padding: "13px 12px",
                            borderBottom: "1px solid #f0e4ea",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {money(service.price)}
                        </td>

                        <td
                          style={{
                            padding: "13px 12px",
                            borderBottom: "1px solid #f0e4ea",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => removeService(service.id)}
                            style={{
                              border: "none",
                              background: "#ffebee",
                              color: "#b52d45",
                              borderRadius: "8px",
                              padding: "7px 11px",
                              cursor: "pointer",
                            }}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ملخص المبالغ */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
                marginTop: "18px",
              }}
              className="invoice-grid"
            >
              <div
                style={{
                  background: "#f8edf3",
                  padding: "15px",
                  borderRadius: "10px",
                }}
              >
                <div style={{ color: "#79445f", fontSize: "14px" }}>
                  إجمالي الخدمات
                </div>
                <strong
                  style={{
                    display: "block",
                    color: "#8d5d32",
                    fontSize: "21px",
                    marginTop: "7px",
                  }}
                >
                  {money(invoiceTotal)}
                </strong>
              </div>

              <div>
                <label style={labelStyle}>الخصم (اختياري)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  max={invoiceTotal}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div
                style={{
                  background: "#f8edf3",
                  padding: "15px",
                  borderRadius: "10px",
                }}
              >
                <div style={{ color: "#79445f", fontSize: "14px" }}>
                  صافي الفاتورة بعد الخصم
                </div>
                <strong
                  style={{
                    display: "block",
                    color: "#397451",
                    fontSize: "21px",
                    marginTop: "7px",
                  }}
                >
                  {money(netInvoiceTotal)}
                </strong>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>طريقة الدفع</label>
                <select
                  style={inputStyle}
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="cash">نقدًا (كاش)</option>
                  <option value="instapay">إنستا باي</option>
                  <option value="vodafone_cash">فودافون كاش</option>
                </select>
                <small style={{ display: "block", color: "#927d89", marginTop: "7px" }}>
                  سيتم تسجيل صافي الفاتورة كدفعة واحدة بالطريقة المختارة.
                </small>
              </div>
            </div>

          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>ملاحظات</label>

            <textarea
              style={{
                ...inputStyle,
                minHeight: "85px",
                resize: "vertical",
              }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات خاصة بالعميلة أو الخدمات..."
            />
          </div>

          {formError && (
            <div
              style={{
                background: "#fff0f0",
                color: "#a12635",
                padding: "13px",
                borderRadius: "9px",
                marginBottom: "15px",
              }}
            >
              {formError}
            </div>
          )}

          {formMessage && (
            <div
              style={{
                background: "#e8f7ed",
                color: "#28633e",
                padding: "13px",
                borderRadius: "9px",
                marginBottom: "15px",
                lineHeight: "1.9",
                overflowWrap: "anywhere",
              }}
            >
              {formMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="gold-button"
            style={{
              width: "100%",
              padding: "16px",
              fontSize: "17px",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "جاري حفظ الفاتورة..."
              : "حفظ"}
          </button>
        </form>
      </section>

      {/* ملخص الصالون */}
      <div style={{ marginBottom: "15px" }}>
        <h2 style={{ color: "#e6c58c", fontSize: "21px" }}>
          ملخص الصالون
        </h2>

        <p style={{ color: "#c5afbf", fontSize: "14px" }}>
          نظرة سريعة على أداء الصالون اليوم
        </p>
      </div>

      {loading ? (
        <div style={{ ...sectionStyle, color: "#422536" }}>
          جاري تحميل بيانات لوحة التحكم...
        </div>
      ) : (
        <>
          {/* بطاقات الإحصائيات */}
          <section className="dashboard-card-grid">
            {cards.map((card) => (
              <div
                key={card.title}
                style={{
                  background: "#352638",
                  border: "1px solid #6c5368",
                  borderTop: `5px solid ${card.color}`,
                  borderRadius: "17px",
                  padding: "21px",
                  boxShadow: "0 5px 18px rgba(0,0,0,.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span style={{ color: "#ddcbd7", fontSize: "14px" }}>
                    {card.title}
                  </span>

                  <span style={{ fontSize: "24px" }}>
                    {card.icon}
                  </span>
                </div>

                <h2
                  style={{
                    color: card.color,
                    margin: "17px 0 0",
                    fontSize: "23px",
                    overflowWrap: "anywhere",
                  }}
                >
                  {card.value}
                </h2>
              </div>
            ))}
          </section>

          {/* أحدث الحجوزات */}
          <section
            className="dashboard-section"
            style={{
              ...sectionStyle,
              marginBottom: "28px",
              color: "#422536",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2 style={{ color: "#79445f", margin: "0 0 7px" }}>
                  أحدث الحجوزات
                </h2>

                <span style={{ color: "#927d89", fontSize: "13px" }}>
                  آخر خمسة حجوزات مسجلة
                </span>
              </div>

              <Link
                href="/bookings"
                style={{
                  color: "#922c5c",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                عرض كل الحجوزات ←
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <p style={{ color: "#927d89" }}>
                لا توجد حجوزات حتى الآن
              </p>
            ) : (
              <div className="dashboard-table-wrap">
                <table
                  className="dashboard-table"
                  style={{
                    width: "100%",
                    minWidth: "950px",
                    borderCollapse: "collapse",
                    textAlign: "right",
                  }}
                >
                  <thead style={{ background: "#f8e8ef" }}>
                    <tr>
                      {[
                        "العميلة",
                        "الخدمات",
                        "الإجمالي",
                        "الخصم",
                        "صافي الفاتورة",
                        "المدفوع",
                        "المتبقي",
                        "التاريخ",
                        "الحالة",
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "14px 12px",
                            color: "#81264f",
                            fontSize: "14px",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {recentBookings.map((booking) => {
                      const displayStatus = booking.status === "confirmed" ? "pending" : booking.status;
                      const status = statusInfo[displayStatus] || {
                        label: displayStatus,
                        color: "#555",
                        background: "#eee",
                      };

                      return (
                        <tr key={booking.id}>
                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                            }}
                          >
                            {booking.customerName}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                              minWidth: "180px",
                              lineHeight: "1.8",
                            }}
                          >
                            {booking.serviceName}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {money(booking.bookingTotal)}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {money(booking.discount)}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                              color: "#397451",
                              fontWeight: "bold",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {money(booking.netTotal)}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                              color: "#397451",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {money(booking.paid)}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                              color:
                                booking.remaining > 0
                                  ? "#ad3545"
                                  : "#397451",
                              fontWeight: "bold",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {money(booking.remaining)}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                            }}
                          >
                            {booking.booking_date}
                          </td>

                          <td
                            style={{
                              padding: "14px 12px",
                              borderBottom: "1px solid #f3e5eb",
                            }}
                          >
                            <span
                              style={{
                                background: status.background,
                                color: status.color,
                                padding: "6px 11px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* أقسام الإدارة */}
          <section>
            <h2 style={{ color: "#e6c58c", marginBottom: "18px" }}>
              أقسام إدارة الصالون
            </h2>

            <div className="dashboard-links-grid">
              {links.filter((item) => role === "manager" || !["/customers", "/services", "/accounting"].includes(item.href)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="dashboard-link"
                  style={{
                    display: "block",
                    background: "#352638",
                    border: "1px solid #6c5368",
                    borderRadius: "16px",
                    padding: "22px",
                    textDecoration: "none",
                    color: "#fff",
                    boxShadow: "0 4px 14px rgba(0,0,0,.12)",
                  }}
                >
                  <div style={{ fontSize: "30px", marginBottom: "13px" }}>
                    {item.icon}
                  </div>

                  <h3
                    style={{
                      color: "#e6c58c",
                      fontSize: "17px",
                      margin: "0 0 9px",
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      color: "#c5afbf",
                      fontSize: "13px",
                      lineHeight: "1.7",
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {role === "manager" && <BackupButton />}

      <footer
        style={{
          textAlign: "center",
          color: "#b99eaf",
          fontSize: "12px",
          marginTop: "35px",
          padding: "18px",
        }}
      >
        MALAK BEAUTY SALON — نظام إدارة الصالون
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
