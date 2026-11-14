"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("جاري تسجيل الدخول...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <main dir="rtl" style={{
      maxWidth: "400px",
      margin: "80px auto",
      padding: "30px",
      fontFamily: "Arial",
      textAlign: "center"
    }}>
      <h1>Malak Beauty Salon</h1>
      <h2>تسجيل الدخول</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "12px", marginBottom: "15px" }}
        />

        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: "12px", marginBottom: "15px" }}
        />

        <button type="submit" style={{ padding: "12px 30px" }}>
          تسجيل الدخول
        </button>
      </form>

      <p>{message}</p>
    </main>
  );
}
