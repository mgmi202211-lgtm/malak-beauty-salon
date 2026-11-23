
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AuthGuard from "../components/AuthGuard";

function ServicesContent() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    service_name: "",
    category: "",
    price: "",
    active: true,
  });

  async function loadServices() {
    setLoading(true);

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("خطأ في تحميل الخدمات: " + error.message);
    } else {
      setServices(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function resetForm() {
    setForm({
      service_name: "",
      category: "",
      price: "",
      active: true,
    });
    setEditingId(null);
  }

  async function saveService(e) {
    e.preventDefault();
    setMessage("");

    if (!form.service_name.trim() || form.price === "") {
      setMessage("اكتب اسم الخدمة والسعر");
      return;
    }

    const price = Number(form.price);

    if (!Number.isFinite(price) || price < 0) {
      setMessage("راجع السعر المدخل");
      return;
    }

    const serviceData = {
      service_name: form.service_name.trim(),
      category: form.category.trim(),
      price,
      active: form.active,
    };

    const result = editingId
      ? await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingId)
      : await supabase
          .from("services")
          .insert([serviceData]);

    if (result.error) {
      setMessage("لم يتم الحفظ: " + result.error.message);
      return;
    }

    setMessage("تم حفظ الخدمة بنجاح");
    resetForm();
    await loadServices();
  }

  function editService(service) {
    setEditingId(service.id);

    setForm({
      service_name: service.service_name || "",
      category: service.category || "",
      price: String(service.price ?? ""),
      active: service.active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleService(service) {
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);

    if (error) {
      setMessage("حدث خطأ: " + error.message);
    } else {
      await loadServices();
    }
  }

  async function deleteService(service) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف خدمة ${service.service_name}؟`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service.id);

    if (error) {
      setMessage("حدث خطأ أثناء الحذف: " + error.message);
    } else {
      setMessage("تم حذف الخدمة بنجاح");
      await loadServices();
    }
  }

  const filteredServices = services.filter((service) => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    return (
      (service.service_name || "").toLowerCase().includes(search) ||
      (service.category || "").toLowerCase().includes(search)
    );
  });

  return (
    <main
      dir="rtl"
      style={{ padding: 25, maxWidth: 1000, margin: "auto" }}
    >
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#9d174d",
            color: "white",
            padding: "12px 20px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          🏠 العودة إلى الصفحة الرئيسية
        </Link>
      </div>

      <h1>إدارة خدمات Malak Beauty Salon</h1>

      <h2>{editingId ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h2>

      <form onSubmit={saveService}>
        <p>اسم الخدمة</p>
        <input
          style={{ width: "100%", padding: 10 }}
          value={form.service_name}
          onChange={(e) =>
            setForm({ ...form, service_name: e.target.value })
          }
          placeholder="اسم الخدمة"
          required
        />

        <p>القسم</p>
        <input
          style={{ width: "100%", padding: 10 }}
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
          }
          placeholder="مثال: الشعر، البشرة، الأظافر"
        />

        <p>السعر بالجنيه</p>
        <input
          type="number"
          min="0"
          style={{ width: "100%", padding: 10 }}
          value={form.price}
          onChange={(e) =>
            setForm({ ...form, price: e.target.value })
          }
          required
        />

        <p>
          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm({ ...form, active: e.target.checked })
              }
            />
            {" "}الخدمة مفعلة
          </label>
        </p>

        <button type="submit" style={{ padding: 12, margin: 5 }}>
          {editingId ? "حفظ التعديل" : "إضافة الخدمة"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            style={{ padding: 12 }}
          >
            إلغاء التعديل
          </button>
        )}
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>قائمة الخدمات</h2>

      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="ابحث باسم الخدمة أو القسم..."
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 15,
          border: "1px solid #ccc",
          borderRadius: 8,
          fontSize: 16,
          boxSizing: "border-box",
        }}
      />

      {loading ? (
        <p>جاري تحميل الخدمات...</p>
      ) : services.length === 0 ? (
        <p>لا توجد خدمات مسجلة حتى الآن</p>
      ) : filteredServices.length === 0 ? (
        <p>لا توجد خدمات مطابقة لبحثك</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table width="100%" cellPadding="10" border="1">
            <thead>
              <tr>
                <th>الخدمة</th>
                <th>القسم</th>
                <th>السعر</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredServices.map((service) => (
                <tr key={service.id}>
                  <td>{service.service_name}</td>
                  <td>{service.category}</td>
                  <td>{service.price} جنيه</td>
                  <td>{service.active ? "مفعلة" : "متوقفة"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => editService(service)}
                    >
                      تعديل
                    </button>
                    {" "}
                    <button
                      type="button"
                      onClick={() => toggleService(service)}
                    >
                      {service.active ? "إيقاف" : "تفعيل"}
                    </button>
                    {" "}
                    <button
                      type="button"
                      onClick={() => deleteService(service)}
                      style={{ color: "red" }}
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

      {!loading && services.length > 0 && (
        <p style={{ marginTop: 12, color: "#666" }}>
          عدد النتائج: {filteredServices.length} من {services.length}
        </p>
      )}
    </main>
  );
}

export default function ServicesPage() {
  return (
    <AuthGuard allowedRoles="manager">
      <ServicesContent />
    </AuthGuard>
  );
}
