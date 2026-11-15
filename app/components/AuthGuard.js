"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session) {
        setAuthorized(true);
        setChecking(false);
      }

      if (event === "SIGNED_OUT") {
        setAuthorized(false);
        setChecking(false);
        router.replace("/login");
      }
    });

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setAuthorized(false);
        setChecking(false);
        router.replace("/login");
      } else {
        setAuthorized(true);
        setChecking(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div dir="rtl" style={{
        textAlign: "center",
        padding: "50px",
        fontFamily: "Arial"
      }}>
        Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„...
      </div>
    );
  }

  if (!authorized) return null;

  return children;
}
