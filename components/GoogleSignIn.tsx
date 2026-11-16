"use client";

import { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

const apiBase = () => (window.location.hostname === "localhost" ? "http://localhost:8080/api" : "/api");

export default function GoogleSignIn() {
  const buttonRef = useRef<HTMLDivElement>(null);
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
        setAvailable(true);

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
        if (cancelled || !buttonRef.current || !window.google) return;
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
        buttonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline", size: "medium", type: "icon", shape: "circle"
        });
      } catch (setupError) {
        if (!cancelled) setError(setupError instanceof Error ? setupError.message : "Google sign-in is unavailable.");
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  if (name) {
    return (
      <div className="flex items-center gap-2">
        <span className="max-w-28 truncate text-xs font-bold text-cyan-200" title={name}>Hi, {name}</span>
        <button onClick={() => void signOut()} className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-zinc-300 transition hover:border-rose-300 hover:text-rose-200">Sign out</button>
      </div>
    );
  }
  if (!available && !error) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={buttonRef} aria-label="Sign in with Google" />
      <span className="text-[9px] font-black uppercase tracking-wide text-zinc-400">Sign in</span>
      {error && <span className="max-w-44 text-right text-[10px] text-rose-300">{error}</span>}
    </div>
  );
}
