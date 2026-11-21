
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

    function handleSession(session) {
      if (!mounted) return;

      if (session) {
        setAuthorized(true);
        setChecking(false);
      } else {
        setAuthorized(false);
        setChecking(false);
        router.replace("/login");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session) {
        handleSession(session);
      } else if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_OUT"
      ) {
        handleSession(null);
      }
    });

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          handleSession(null);
          return;
        }

        handleSession(data.session);
      } catch (error) {
        handleSession(null);
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
      <div
        dir="rtl"
        style={{
          textAlign: "center",
          padding: "50px",
          fontFamily: "Arial",
        }}
      >
        جاري التحقق من تسجيل الدخول...
      </div>
    );
  }

  if (!authorized) return null;

  return children;
}
