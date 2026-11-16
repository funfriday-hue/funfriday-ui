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
        const { clientId } = await configResponse.json();
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
          theme: "outline", size: "medium", type: "standard", text: "signin_with", shape: "pill", width: 180
        });
      } catch (setupError) {
        if (!cancelled) setError(setupError instanceof Error ? setupError.message : "Google sign-in is unavailable.");
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  if (name) return <span className="max-w-36 truncate text-xs font-bold text-cyan-200" title={name}>Hi, {name}</span>;
  if (!available && !error) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div ref={buttonRef} aria-label="Sign in with Google" />
      {error && <span className="max-w-44 text-right text-[10px] text-rose-300">{error}</span>}
    </div>
  );
}
