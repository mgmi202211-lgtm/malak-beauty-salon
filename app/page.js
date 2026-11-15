
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import AuthGuard from "./components/AuthGuard";

function Dashboard() {
  const router = useRouter();

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

  const today = new Date().toLocaleDateString("en-CA");

  const money = (value) =>
    Number(value || 0).toLocaleString("ar-EG", {
      maximumFractionDigits: 2,
    }) + " جنيه";

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("تعذر تسجيل الخروج: " + error.message);
      return;
    }

    router.replace("/login");
  }

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        customersResult,
        bookingsResult,
        servicesResult,
        expensesResult,
      ] = await Promise.all([
        supabase.from("customers").select("*"),
        supabase.from("bookings").select("*"),
        supabase.from("services").select("*"),
        supabase.from("expenses").select("*"),
      ]);

      const error =
        customersResult.error ||
        bookingsResult.error ||
        servicesResult.error ||
        expensesResult.error;

      if (error) throw error;

      const customers = customersResult.data || [];
      const bookings = bookingsResult.data || [];
      const services = servicesResult.data || [];
      const expenses = expensesResult.data || [];

      const todayBookings = bookings.filter(
        (booking) => booking.booking_date === today
      );

      const todayExpenses = expenses
        .filter((expense) => expense.expense_date === today)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      const todayRevenue = todayBookings
        .filter((booking) => booking.status === "completed")
        .reduce((sum, booking) => {
          const service = services.find(
            (item) => String(item.id) === String(booking.service_id)
          );

          return sum + Number(service?.price || 0);
        }, 0);

      setStats({
        customers: customers.length,
        bookings: bookings.length,
        revenue: todayRevenue,
        expenses: todayExpenses,
        profit: todayRevenue - todayExpenses,
      });

      const latest = [...bookings]
        .sort((a, b) =>
          `${b.booking_date} ${b.booking_time || ""}`.localeCompare(
            `${a.booking_date} ${a.booking_time || ""}`
          )
        )
        .slice(0, 5)
        .map((booking) => {
          const customer = customers.find(
            (item) => String(item.id) === String(booking.customer_id)
          );

          const service = services.find(
            (item) => String(item.id) === String(booking.service_id)
          );

          return {
            ...booking,
            customerName: customer?.full_name || "غير معروف",
            serviceName: service?.service_name || "غير معروف",
          };
        });

      setRecentBookings(latest);
    } catch (error) {
      console.error("Dashboard Error:", error);
      setErrorMessage("تعذر تحميل بيانات لوحة التحكم: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = [
    {
      title: "عدد العميلات",
      value: stats.customers,
      color: "#9b4770",
      icon: "👩",
    },
    {
      title: "إجمالي الحجوزات",
      value: stats.bookings,
      color: "#8b65a1",
      icon: "📅",
    },
    {
      title: "إيرادات اليوم",
      value: money(stats.revenue),
      color: "#397451",
      icon: "💰",
    },
    {
      title: "مصروفات اليوم",
      value: money(stats.expenses),
      color: "#b64c62",
      icon: "🧾",
    },
    {
      title: "صافي ربح اليوم",
      value: money(stats.profit),
      color: "#a77b2f",
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
    pending: { label: "جديد", color: "#9a6a19", background: "#fff4d9" },
    confirmed: { label: "مؤكد", color: "#326c9b", background: "#e8f4ff" },
    completed: { label: "مكتمل", color: "#397451", background: "#e8f7ed" },
    cancelled: { label: "ملغي", color: "#ad3545", background: "#ffebee" },
  };

  const sectionStyle = {
    background: "#ffffff",
    border: "1px solid #f0dce5",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 5px 18px rgba(120, 40, 75, 0.05)",
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
        .dashboard-link {
          transition: transform .2s, box-shadow .2s;
        }
        .dashboard-link:hover {
          transform: translateY(-4px);
          box-shadow: 0 9px 22px rgba(120, 40, 75, .12);
        }
        .dashboard-table tr:hover {
          background: #fff7fa;
        }
        @media (max-width: 600px) {
          .dashboard-header {
            padding: 22px !important;
          }
        }
      `}</style>

      <header
        className="dashboard-header"
        style={{
          background: "linear-gradient(135deg, #81264f, #bd668c)",
          color: "white",
          padding: "32px",
          borderRadius: "22px",
          marginBottom: "25px",
          boxShadow: "0 8px 25px rgba(143, 40, 85, .18)",
        }}
      >
        <div
          style={{
            color: "#f9dfb0",
            fontSize: "14px",
            letterSpacing: "2px",
          }}
        >
        MALAK BEAUTY SALON — نظام إدارة الصالون
        </div>

        <h1 style={{ fontSize: "32px", margin: "12px 0" }}>
          صالون ملك للتجميل
        </h1>

        <p style={{ color: "#fff0f5", margin: 0 }}>
          أهلاً بك في لوحة إدارة الصالون
        </p>

        <div
          className="no-print"
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
              background: "#ffffff20",
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
            onClick={loadDashboard}
            disabled={loading}
            style={{
              background: "#f5dfb4",
              color: "#71344f",
              border: "none",
              borderRadius: "9px",
              padding: "10px 17px",
              cursor: loading ? "wait" : "pointer",
              fontWeight: "bold",
            }}
          >
            {loading ? "جاري التحديث..." : "↻ تحديث البيانات"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "#ffffff",
              color: "#9d174d",
              border: "none",
              borderRadius: "9px",
              padding: "10px 17px",
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

      <div style={{ marginBottom: "15px" }}>
        <h2 style={{ color: "#922c5c", fontSize: "21px" }}>
          ملخص الصالون
        </h2>
        <p style={{ color: "#927d89", fontSize: "14px" }}>
          نظرة سريعة على أداء الصالون اليوم
        </p>
      </div>

      {loading ? (
        <div style={sectionStyle}>
          جاري تحميل بيانات لوحة التحكم...
        </div>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            {cards.map((card) => (
              <div
                key={card.title}
                style={{
                  background: "white",
                  border: "1px solid #f0dce5",
                  borderTop: `5px solid ${card.color}`,
                  borderRadius: "17px",
                  padding: "21px",
                  boxShadow: "0 5px 18px rgba(120, 40, 75, .05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#806b77", fontSize: "14px" }}>
                    {card.title}
                  </span>
                  <span style={{ fontSize: "24px" }}>{card.icon}</span>
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

          <section style={{ ...sectionStyle, marginBottom: "28px" }}>
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
                <h2 style={{ color: "#922c5c", margin: "0 0 7px" }}>
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
              <div style={{ overflowX: "auto" }}>
                <table
                  className="dashboard-table"
                  style={{
                    width: "100%",
                    minWidth: "600px",
                    borderCollapse: "collapse",
                    textAlign: "right",
                  }}
                >
                  <thead style={{ background: "#f8e8ef" }}>
                    <tr>
                      {["العميلة", "الخدمة", "التاريخ", "الوقت", "الحالة"].map(
                        (heading) => (
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
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {recentBookings.map((booking) => {
                      const status =
                        statusInfo[booking.status] || {
                          label: booking.status,
                          color: "#555",
                          background: "#eee",
                        };

                      return (
                        <tr key={booking.id}>
                          <td style={{ padding: "14px 12px", borderBottom: "1px solid #f3e5eb" }}>
                            {booking.customerName}
                          </td>
                          <td style={{ padding: "14px 12px", borderBottom: "1px solid #f3e5eb" }}>
                            {booking.serviceName}
                          </td>
                          <td style={{ padding: "14px 12px", borderBottom: "1px solid #f3e5eb" }}>
                            {booking.booking_date}
                          </td>
                          <td style={{ padding: "14px 12px", borderBottom: "1px solid #f3e5eb" }}>
                            {booking.booking_time || "-"}
                          </td>
                          <td style={{ padding: "14px 12px", borderBottom: "1px solid #f3e5eb" }}>
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

          <section>
            <h2 style={{ color: "#922c5c", marginBottom: "18px" }}>
              أقسام إدارة الصالون
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "15px",
              }}
            >
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="dashboard-link"
                  style={{
                    display: "block",
                    background: "white",
                    border: "1px solid #f0dce5",
                    borderRadius: "16px",
                    padding: "22px",
                    textDecoration: "none",
                    color: "#422536",
                    boxShadow: "0 4px 14px rgba(120, 40, 75, .04)",
                  }}
                >
                  <div style={{ fontSize: "30px", marginBottom: "13px" }}>
                    {item.icon}
                  </div>

                  <h3
                    style={{
                      color: "#922c5c",
                      fontSize: "17px",
                      margin: "0 0 9px",
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      color: "#927d89",
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

      <footer
        style={{
          textAlign: "center",
          color: "#a58b98",
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

