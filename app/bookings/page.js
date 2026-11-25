"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import AuthGuard, { useSalonRole } from "../components/AuthGuard";

const field = { display: "block", width: "100%", boxSizing: "border-box", padding: 11, marginTop: 6, border: "1px solid #d8c5cf", borderRadius: 9, fontSize: 15, background: "#fff" };

function BookingsContent() {
  const { role } = useSalonRole();
  const manager = role === "manager";
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [lines, setLines] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    const [c, s, b, l] = await Promise.all([
      supabase.from("customers").select("*").order("full_name"),
      supabase.from("services").select("*"),
      supabase.from("bookings").select("*").order("booking_date", { ascending: false }).order("booking_time", { ascending: false }),
      supabase.from("booking_services").select("*")
    ]);
    const error = c.error || s.error || b.error || l.error;
    if (error) return setMessage("خطأ في تحميل البيانات: " + error.message);
    setCustomers(c.data || []); setServices(s.data || []); setBookings(b.data || []); setLines(l.data || []);
  }
  useEffect(() => { load(); }, []);

  const statusOf = b => !b.status || b.status === "confirmed" ? "pending" : b.status;
  const customerOf = b => customers.find(c => String(c.id) === String(b.customer_id));
  const servicesOf = b => {
    const saved = lines.filter(x => String(x.booking_id) === String(b.id));
    if (saved.length) return saved.map(x => ({ id: x.service_id, name: services.find(s => String(s.id) === String(x.service_id))?.service_name || ("خدمة رقم " + x.service_id), price: Number(x.price) || 0 }));
    const old = services.find(s => String(s.id) === String(b.service_id));
    return [{ id: b.service_id, name: old?.service_name || ("خدمة رقم " + b.service_id), price: Number(old?.price) || 0 }];
  };

  function beginEdit(b) {
    if (!manager) return;
    const saved = lines.filter(x => String(x.booking_id) === String(b.id)).map(x => String(x.service_id));
    setEditing(b.id);
    setDraft({ customer_id: String(b.customer_id || ""), booking_date: b.booking_date || "", booking_time: String(b.booking_time || "").slice(0, 5), status: statusOf(b), notes: b.notes || "", discount: String(b.discount_amount || 0), service_ids: saved.length ? saved : [String(b.service_id)] });
    setMessage("");
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!manager || !editing || !draft) return;
    const service_lines = draft.service_ids.map(id => services.find(s => String(s.id) === String(id))).filter(Boolean).map(s => ({ service_id: Number(s.id), price: Number(s.price || 0) }));
    const subtotal = service_lines.reduce((n, x) => n + x.price, 0), discount = Number(draft.discount || 0);
    if (!draft.customer_id || !draft.booking_date || !draft.booking_time) return setMessage("يرجى استكمال العميلة والتاريخ والوقت.");
    if (!service_lines.length) return setMessage("يجب اختيار خدمة واحدة على الأقل.");
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) return setMessage("قيمة الخصم غير صحيحة.");
    setSaving(true);
    const { error } = await supabase.rpc("manager_update_booking", { p_booking_id: Number(editing), p_customer_id: Number(draft.customer_id), p_booking_date: draft.booking_date, p_booking_time: draft.booking_time, p_status: draft.status, p_notes: draft.notes || "", p_discount_amount: discount, p_service_lines: service_lines });
    setSaving(false);
    if (error) return setMessage("تعذر حفظ التعديل: " + error.message);
    setMessage("تم تعديل الحجز بنجاح."); setEditing(null); setDraft(null); await load();
  }

  async function removeBooking(b) {
    if (!manager) return;
    const customer = customerOf(b);
    if (!window.confirm("تأكيد الحذف النهائي للحجز رقم " + b.id + " للعميلة " + (customer?.full_name || "") + "؟ سيتم حذف الحجز وكل الخدمات والإيرادات والمدفوعات المرتبطة به من الحسابات والتقارير. لا يمكن التراجع عن هذا الإجراء.")) return;
    setDeleting(b.id);
    const { error } = await supabase.rpc("manager_delete_booking", { p_booking_id: Number(b.id) });
    setDeleting(null);
    if (error) return setMessage("تعذر حذف الحجز: " + error.message);
    setMessage("تم حذف الحجز رقم " + b.id + " بنجاح.");
    if (String(editing) === String(b.id)) { setEditing(null); setDraft(null); }
    await load();
  }

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("ar");
    if (!q) return bookings;
    return bookings.filter(b => {
      const c = customers.find(x => String(x.id) === String(b.customer_id));
      const names = lines.filter(x => String(x.booking_id) === String(b.id)).map(x => services.find(s => String(s.id) === String(x.service_id))?.service_name || "").join(" ");
      return [b.id, c?.full_name, c?.phone, names].some(v => String(v || "").toLocaleLowerCase("ar").includes(q));
    });
  }, [bookings, customers, lines, services, search]);

  return <main dir="rtl" style={{ maxWidth: 1500, margin: "24px auto", padding: "16px 20px 40px", fontFamily: "Arial,sans-serif", color: "#382337" }}>
    <Link href="/" style={{ display: "inline-block", padding: "11px 18px", background: "#70445f", color: "white", textDecoration: "none", borderRadius: 9, marginBottom: 18, fontWeight: "bold" }}>← العودة إلى الصفحة الرئيسية</Link>
    <header style={{ background: "linear-gradient(120deg,#382337,#70445f)", color: "white", padding: "22px 24px", borderRadius: 16 }}>
      <div style={{ color: "#e6c58c", fontSize: 13, fontWeight: 700 }}>MALAK BEAUTY SALON</div>
      <h1 style={{ margin: "7px 0", fontSize: 27 }}>سجل الحجوزات</h1>
      <p style={{ margin: 0, color: "#f5eaf0" }}>كل الحجوزات في سجل واحد بكامل بيانات العميلة والخدمات والمواعيد.</p>
    </header>
    {message && <div role="status" style={{ padding: 13, background: "#fff4f7", color: "#70445f", border: "1px solid #ead2dd", borderRadius: 9, margin: "14px 0" }}>{message}</div>}
    <section style={{ background: "white", border: "1px solid #eadde4", borderRadius: 14, padding: 16, marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div><h2 style={{ margin: 0, fontSize: 21, color: "#70445f" }}>كل الحجوزات</h2><p style={{ margin: "6px 0 0", color: "#76596b" }}>عدد النتائج: {visible.length}</p></div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم العميلة أو رقم الهاتف أو رقم الحجز أو الخدمة" aria-label="بحث في سجل الحجوزات" style={{ ...field, maxWidth: 430, marginTop: 0 }} />
      </div>
      {!visible.length ? <div style={{ textAlign: "center", padding: 35, color: "#806b78" }}>{bookings.length ? "لا توجد نتائج مطابقة للبحث." : "لا توجد حجوزات مسجلة حتى الآن."}</div> :
      <div style={{ overflowX: "auto", border: "1px solid #eee4e9", borderRadius: 10 }}>
        <table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse", textAlign: "center", fontSize: 14 }}>
          <thead style={{ background: "#f7eff3", color: "#56364b" }}><tr>{["رقم الحجز","اسم العميلة","رقم التليفون","الخدمات","إجمالي الخدمات","الخصم","الصافي","التاريخ","الوقت",...(manager ? ["الإجراءات"] : [])].map(h => <th key={h} style={{ padding: "13px 10px", whiteSpace: "nowrap", borderBottom: "1px solid #e8d9e1" }}>{h}</th>)}</tr></thead>
          <tbody>{visible.map(b => {
            const c = customerOf(b), items = servicesOf(b), subtotal = items.reduce((n,x) => n+x.price,0), discount = Number(b.discount_amount || 0), net = Math.max(0,subtotal-discount);
            return <tr key={b.id} style={{ borderBottom: "1px solid #f0e8ed" }}>
              <td style={{ padding: 12, fontWeight: 700 }}>#{b.id}</td>
              <td style={{ padding: 12, fontWeight: 700, minWidth: 150 }}>{c?.full_name || "غير متاح"}</td>
              <td style={{ padding: 12, direction: "ltr", whiteSpace: "nowrap" }}>{c?.phone || "-"}</td>
              <td style={{ padding: 12, textAlign: "right", minWidth: 190 }}>{items.map((x,i) => <div key={i} style={{ margin: "3px 0" }}>{x.name} <span style={{ color: "#806b78" }}>({x.price.toLocaleString("ar-EG")} ج)</span></div>)}</td>
              <td style={{ padding: 12, whiteSpace: "nowrap" }}>{subtotal.toLocaleString("ar-EG")} ج</td>
              <td style={{ padding: 12, whiteSpace: "nowrap" }}>{discount.toLocaleString("ar-EG")} ج</td>
              <td style={{ padding: 12, color: "#70445f", fontWeight: 700, whiteSpace: "nowrap" }}>{net.toLocaleString("ar-EG")} ج</td>
              <td style={{ padding: 12, whiteSpace: "nowrap" }}>{b.booking_date || "-"}</td>
              <td style={{ padding: 12, whiteSpace: "nowrap" }}>{String(b.booking_time || "").slice(0,5) || "-"}</td>
              {manager && <td style={{ padding: 10, minWidth: 155 }}><div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}><button type="button" onClick={() => beginEdit(b)} style={{ border: 0, borderRadius: 7, padding: "8px 11px", color: "white", background: "#70445f", cursor: "pointer", fontWeight: 700 }}>تعديل</button><button type="button" disabled={deleting === b.id} title="حذف الحجز نهائيًا مع سجلاته المالية" onClick={() => removeBooking(b)} style={{ border: 0, borderRadius: 7, padding: "8px 11px", color: "white", background: "#a83245", cursor: deleting === b.id ? "wait" : "pointer", opacity: deleting === b.id ? .6 : 1, fontWeight: 700 }}>{deleting === b.id ? "جارٍ الحذف" : "حذف نهائي"}</button></div></td>}
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
    {manager && editing && draft && <section style={{ marginTop: 20, padding: 20, border: "1px solid #ead5df", borderRadius: 14, background: "#fffafd" }}>
      <h2 style={{ color: "#70445f", marginTop: 0 }}>تعديل الحجز رقم {editing}</h2>
      <form onSubmit={saveEdit} style={{ display: "grid", gap: 14 }}>
        <label>العميلة<select value={draft.customer_id} onChange={e => setDraft({...draft,customer_id:e.target.value})} required style={field}><option value="">اختيار العميلة</option>{customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}</select></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <label>التاريخ<input type="date" value={draft.booking_date} onChange={e => setDraft({...draft,booking_date:e.target.value})} required style={field}/></label>
          <label>الوقت<input type="time" value={draft.booking_time} onChange={e => setDraft({...draft,booking_time:e.target.value})} required style={field}/></label>
          <label>الخصم<input type="number" min="0" step="0.01" value={draft.discount} onChange={e => setDraft({...draft,discount:e.target.value})} style={field}/></label>
        </div>
        <div><strong>الخدمات والأسعار</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginTop: 8 }}>{services.map(s => <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, border: "1px solid #ead5df", borderRadius: 8 }}><input type="checkbox" checked={draft.service_ids.includes(String(s.id))} onChange={e => setDraft({...draft,service_ids:e.target.checked ? [...draft.service_ids,String(s.id)] : draft.service_ids.filter(id => id !== String(s.id))})}/><span>{s.service_name} — {Number(s.price||0).toLocaleString("ar-EG")} جنيه</span></label>)}</div></div>
        <label>ملاحظات<textarea value={draft.notes} onChange={e => setDraft({...draft,notes:e.target.value})} rows={3} style={field}/></label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="submit" disabled={saving} style={{ padding: "12px 20px", border: 0, borderRadius: 8, background: "#70445f", color: "white", cursor: "pointer" }}>{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button><button type="button" onClick={() => {setEditing(null);setDraft(null);}} style={{ padding: "12px 20px", border: 0, borderRadius: 8, background: "#eee", cursor: "pointer" }}>إلغاء</button></div>
      </form>
    </section>}
    {!manager && <p style={{ marginTop: 14, color: "#76596b", fontSize: 13 }}>العرض فقط — تعديل الحجوزات أو حذفها نهائيًا متاح لحساب المدير فقط.</p>}
  </main>;
}
export default function BookingsPage() { return <AuthGuard><BookingsContent /></AuthGuard>; }
