import type { AppProps } from "next/app";
import { ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import { useEffect } from "react";
import theme from "../config/theme";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const handleLogout = (event: StorageEvent) => {
      if (event.key === "logout_event") {
        window.location.href = "/login";
      }
    };

    window.addEventListener("storage", handleLogout);
    return () => window.removeEventListener("storage", handleLogout);
  }, []);

  return (
    <ConfigProvider locale={thTH} theme={theme}>
      <Component {...pageProps} />
    </ConfigProvider>
  );
}