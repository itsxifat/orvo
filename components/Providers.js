"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/context/CartContext";
import { SettingsProvider } from "@/context/SettingsContext";

export default function Providers({ children, session, settings }) {
  return (
    <SessionProvider session={session}>
      <CartProvider>
        <SettingsProvider initial={settings}>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3200,
              style: {
                background: "#0F0F11",
                color: "#FFFFFF",
                borderRadius: "999px",
                fontSize: "14.5px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                padding: "12px 20px",
                boxShadow: "0 22px 48px -20px rgba(15,17,20,0.45)",
              },
              success: { iconTheme: { primary: "#FFC93C", secondary: "#0F0F11" } },
              error: { iconTheme: { primary: "#DC2626", secondary: "#FFFFFF" } },
            }}
          />
        </SettingsProvider>
      </CartProvider>
    </SessionProvider>
  );
}
