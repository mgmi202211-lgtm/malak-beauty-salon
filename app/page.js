
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
    }) + " Ø¬Ù†ÙŠÙ‡";

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ØªØ¹Ø°Ø± ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬: " + error.message);
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
            customerName: customer?.full_name || "ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ",
            serviceName: service?.service_name || "ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ",
          };
        });

      setRecentBookings(latest);
    } catch (error) {
      console.error("Dashboard Error:", error);
      setErrorMessage("ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = [
    {
      title: "Ø¹Ø¯Ø¯ Ø§Ù„Ø¹Ù…ÙŠÙ„Ø§Øª",
      value: stats.customers,
      color: "#9b4770",
      icon: "ðŸ‘©",
    },
    {
      title: "Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª",
      value: stats.bookings,
      color: "#8b65a1",
      icon: "ðŸ“…",
    },
    {
      title: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„ÙŠÙˆÙ…",
      value: money(stats.revenue),
      color: "#397451",
      icon: "ðŸ’°",
    },
    {
      title: "Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„ÙŠÙˆÙ…",
      value: money(stats.expenses),
      color: "#b64c62",
      icon: "ðŸ§¾",
    },
    {
      title: "ØµØ§ÙÙŠ Ø±Ø¨Ø­ Ø§Ù„ÙŠÙˆÙ…",
      value: money(stats.profit),
      color: "#a77b2f",
      icon: "âœ¨",
    },
  ];

  const links = [
    {
      title: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„Ø§Øª",
      description: "Ø¥Ø¶Ø§ÙØ© ÙˆØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¹Ù…ÙŠÙ„Ø§Øª",
      href: "/customers",
      icon: "ðŸ‘©â€ðŸ’¼",
    },
    {
      title: "Ø§Ù„Ø®Ø¯Ù…Ø§Øª ÙˆØ§Ù„Ø£Ø³Ø¹Ø§Ø±",
      description: "Ø¥Ø¯Ø§Ø±Ø© Ø®Ø¯Ù…Ø§Øª Ø§Ù„ØµØ§Ù„ÙˆÙ† ÙˆØ£Ø³Ø¹Ø§Ø±Ù‡Ø§",
      href: "/services",
      icon: "ðŸ’‡â€â™€ï¸",
    },
    {
      title: "Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª",
      description: "Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù…ÙˆØ§Ø¹ÙŠØ¯ ÙˆØ­Ø§Ù„Ø§Øª Ø§Ù„Ø­Ø¬Ø²",
      href: "/bookings",
      icon: "ðŸ“…",
    },
    {
      title: "Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙˆØ§Ù„ØªÙ‚Ø§Ø±ÙŠØ±",
      description: "Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ù…ØµØ±ÙˆÙØ§Øª ÙˆØ§Ù„Ø£Ø±Ø¨Ø§Ø­",
      href: "/accounting",
      icon: "ðŸ“Š",
    },
    {
      title: "Ø¥Ø¶Ø§ÙØ© Ù…ØµØ±ÙˆÙ",
      description: "ØªØ³Ø¬ÙŠÙ„ Ù…ØµØ±ÙˆÙ Ø¬Ø¯ÙŠØ¯",
      href: "/expenses",
      icon: "âž•",
    },
  ];

  const statusInfo = {
    pending: { label: "Ø¬Ø¯ÙŠØ¯", color: "#9a6a19", background: "#fff4d9" },
    confirmed: { label: "Ù…Ø¤ÙƒØ¯", color: "#326c9b", background: "#e8f4ff" },
    completed: { label: "Ù…ÙƒØªÙ…Ù„", color: "#397451", background: "#e8f7ed" },
    cancelled: { label: "Ù…Ù„ØºÙŠ", color: "#ad3545", background: "#ffebee" },
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
          MALAK BEAUTY SALON
        </div>

        <h1 style={{ fontSize: "32px", margin: "12px 0" }}>
          ØµØ§Ù„ÙˆÙ† Ù…Ù„Ùƒ Ù„Ù„ØªØ¬Ù…ÙŠÙ„
        </h1>

        <p style={{ color: "#fff0f5", margin: 0 }}>
          Ø£Ù‡Ù„Ø§Ù‹ Ø¨Ùƒ ÙÙŠ Ù„ÙˆØ­Ø© Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµØ§Ù„ÙˆÙ†
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
            ðŸ“… {today}
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
            {loading ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¯ÙŠØ«..." : "â†» ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª"}
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
            ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬
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
          Ù…Ù„Ø®Øµ Ø§Ù„ØµØ§Ù„ÙˆÙ†
        </h2>
        <p style={{ color: "#927d89", fontSize: "14px" }}>
          Ù†Ø¸Ø±Ø© Ø³Ø±ÙŠØ¹Ø© Ø¹Ù„Ù‰ Ø£Ø¯Ø§Ø¡ Ø§Ù„ØµØ§Ù„ÙˆÙ† Ø§Ù„ÙŠÙˆÙ…
        </p>
      </div>

      {loading ? (
        <div style={sectionStyle}>
          Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…...
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
                  Ø£Ø­Ø¯Ø« Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª
                </h2>
                <span style={{ color: "#927d89", fontSize: "13px" }}>
                  Ø¢Ø®Ø± Ø®Ù…Ø³Ø© Ø­Ø¬ÙˆØ²Ø§Øª Ù…Ø³Ø¬Ù„Ø©
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
                Ø¹Ø±Ø¶ ÙƒÙ„ Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª â†
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <p style={{ color: "#927d89" }}>
                Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø¬ÙˆØ²Ø§Øª Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†
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
                      {["Ø§Ù„Ø¹Ù…ÙŠÙ„Ø©", "Ø§Ù„Ø®Ø¯Ù…Ø©", "Ø§Ù„ØªØ§Ø±ÙŠØ®", "Ø§Ù„ÙˆÙ‚Øª", "Ø§Ù„Ø­Ø§Ù„Ø©"].map(
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
              Ø£Ù‚Ø³Ø§Ù… Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµØ§Ù„ÙˆÙ†
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

