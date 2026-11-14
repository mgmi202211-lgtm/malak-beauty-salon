
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [category, setCategory] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("category", { ascending: true })
      .order("service_name", { ascending: true });

    if (error) {
      setMessage("خطأ في تحميل الخدمات: " + error.message);
      return;
    }

    setServices(data || []);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function cancelEditing() {
    setEditingId(null);
    setCategory("");
    setServiceName("");
    setPrice("");
    setMessage("");
  }

  function startEditing(service) {
    setEditingId(service.id);
    setCategory(service.category || "");
    setServiceName(service.service_name || "");
    setPrice(String(service.price ?? ""));
    setMessage("");
  }

  async function saveService(e) {
    e.preventDefault();

    if (!category.trim() || !serviceName.trim() || price === "") {
      setMessage("من فضلك اكتب التصنيف واسم الخدمة والسعر");
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setMessage("من فضلك أدخل سعرًا صحيحًا");
      return;
    }

    setLoading(true);
    setMessage("");

    const serviceData = {
      category: category.trim(),
      service_name: serviceName.trim(),
      price: numericPrice
    };

    const result = editingId
      ? await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingId)
      : await supabase
          .from("services")
          .insert({
            ...serviceData,
            active: true
          });

    setLoading(false);

    if (result.error) {
      setMessage("تعذر حفظ الخدمة: " + result.error.message);
      return;
    }

    cancelEditing();
    setMessage(
      editingId
        ? "تم تعديل الخدمة بنجاح"
        : "تمت إضافة الخدمة بنجاح"
    );

    await loadServices();
  }

  async function toggleService(service) {
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id);

    if (error) {
      setMessage("تعذر تغيير حالة الخدمة: " + error.message);
      return;
    }

    setMessage(
      service.active
        ? "تم إيقاف الخدمة"
        : "تم تفعيل الخدمة"
    );

    await loadServices();
  }

  return (
    <main dir="rtl" style={{
      maxWidth: "950px",
      margin: "30px auto",
      padding: "20px",
      fontFamily: "Arial"
    }}>
      <h1>إدارة الخدمات والأسعار - صالون ملك</h1>

      <form onSubmit={saveService}>
        <div style={{ marginBottom: "12px" }}>
          <input
            placeholder="تصنيف الخدمة - مثال: الشعر"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={{ padding: "12px", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <input
            placeholder="اسم الخدمة"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            required
            style={{ padding: "12px", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="السعر بالجنيه"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            style={{ padding: "12px", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 25px", margin: "5px" }}
        >
          {loading
            ? "جارٍ الحفظ..."
            : editingId
              ? "حفظ التعديل"
              : "إضافة خدمة"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={cancelEditing}
            style={{ padding: "12px 25px", margin: "5px" }}
          >
            إلغاء التعديل
          </button>
        )}
      </form>

      <p>{message}</p>

      <h2>قائمة الخدمات والأسعار</h2>

      <table width="100%" border="1" cellPadding="10">
        <thead>
          <tr>
            <th>التصنيف</th>
            <th>اسم الخدمة</th>
            <th>السعر</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {services.length > 0 ? (
            services.map((service) => (
              <tr key={service.id}>
                <td>{service.category}</td>
                <td>{service.service_name}</td>
                <td>{service.price} جنيه</td>
                <td>
                  {service.active ? "نشطة" : "متوقفة"}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => startEditing(service)}
                  >
                    تعديل
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleService(service)}
                    style={{ margin: "5px", padding: "8px" }}
                  >
                    {service.active ? "إيقاف" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">لا توجد خدمات مسجلة</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
