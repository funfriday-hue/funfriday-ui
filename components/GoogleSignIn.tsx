"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const apiBase = () => (window.location.hostname === "localhost" ? "http://localhost:8080/api" : "/api");

export default function GoogleSignIn() {
  const [name, setName] = useState("");
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    try {
      await fetch(`${apiBase()}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      Cookies.remove("playerName", { path: "/" });
      setName("");
      window.dispatchEvent(new Event("funfriday-auth-updated"));
      window.location.reload();
    }
  };

  useEffect(() => {
    let mounted = true;
    const showAccount = async () => {
      try {
        const response = await fetch(`${apiBase()}/auth/me`, { credentials: "include" });
        const account = await response.json();
        if (mounted && account.signedIn) {
          Cookies.set("playerName", account.name, { expires: 365, path: "/", sameSite: "lax" });
          setName(account.name);
        }
      } catch { /* The game remains usable for guests. */ }
    };
    void showAccount();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestGoogleLogin = () => window.google?.accounts.id.prompt();
    window.addEventListener("funfriday-request-google-login", requestGoogleLogin);
    const initialize = async () => {
      try {
        const configResponse = await fetch(`${apiBase()}/auth/google/config`, { credentials: "include" });
        // An older backend or an nginx fallback can return an empty/non-JSON response.
        // Treat Google sign-in as unavailable instead of surfacing a JSON parser error.
        if (!configResponse.ok) return;
        const configText = await configResponse.text();
        if (!configText.trim()) return;
        let clientId = "";
        try {
          const config = JSON.parse(configText) as { clientId?: string };
          clientId = config.clientId ?? "";
        } catch {
          return;
        }
        if (!clientId || cancelled) return;

        await new Promise<void>((resolve, reject) => {
          if (window.google) return resolve();
          const existing = document.getElementById("google-identity-services");
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load.")), { once: true });
            return;
          }
          const script = document.createElement("script");
          script.id = "google-identity-services";
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Google sign-in failed to load."));
          document.head.appendChild(script);
        });
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            if (!credential) return setError("Google did not return a sign-in credential.");
            try {
              const response = await fetch(`${apiBase()}/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ credential })
              });
              const account = await response.json();
              if (!response.ok) throw new Error(account.error || "Unable to sign in.");
              Cookies.set("playerName", account.name, { expires: 365, path: "/", sameSite: "lax" });
              setName(account.name);
              window.dispatchEvent(new Event("funfriday-auth-updated"));
            } catch (signInError) {
              setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
            }
          }
        });
        setAvailable(true);
      } catch (setupError) {
        if (!cancelled) setError(setupError instanceof Error ? setupError.message : "Google sign-in is unavailable.");
      }
    };
    void initialize();
    return () => {
      cancelled = true;
      window.removeEventListener("funfriday-request-google-login", requestGoogleLogin);
    };
  }, []);

  if (name) {
    return (
      <div className="group relative">
        <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-cyan-200 transition hover:bg-white/10" title={name}>
          <span className="max-w-28 truncate">Hi, {name}</span><span aria-hidden="true" className="text-[9px]">▾</span>
        </button>
        <div className="invisible absolute right-0 top-full z-50 mt-1 w-28 rounded-lg border border-white/10 bg-zinc-950 p-1 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <button onClick={() => void signOut()} className="w-full rounded-md px-2 py-2 text-left text-[10px] font-black uppercase tracking-wide text-zinc-300 transition hover:bg-white/10 hover:text-rose-200">Sign out</button>
        </div>
      </div>
    );
  }
  if (!available && !error) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => window.google?.accounts.id.prompt()}
        className="group flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-gradient-to-r from-cyan-400/10 to-zinc-950 px-3 py-2 shadow-[0_0_18px_rgba(34,211,238,.08)] transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_0_22px_rgba(34,211,238,.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        aria-label="Sign in with Google"
        title="Sign in with Google"
      >
        <span className="text-[10px] font-black uppercase tracking-[.12em] text-cyan-100">Log in</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white p-0.5 shadow-sm transition group-hover:scale-110">
          <img src="/google-g.svg" alt="Google" className="h-full w-full" />
        </span>
      </button>
      {error && <span className="max-w-44 text-right text-[10px] text-rose-300">{error}</span>}
    </div>
  );
}
