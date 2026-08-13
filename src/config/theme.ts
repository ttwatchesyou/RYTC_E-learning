// src/config/theme.ts
import type { ThemeConfig } from "antd";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#1D4ED8", // สีน้ำเงินหลักของระบบ
    colorPrimaryHover: "#2563EB",
    colorPrimaryActive: "#1E40AF",
    colorLink: "#1D4ED8",
    colorLinkHover: "#2563EB",
    colorInfo: "#2563EB",
    colorSuccess: "#10B981",
    colorWarning: "#FACC15", // สีเหลืองเน้น
    colorError: "#EF4444",
    colorText: "#172554",
    colorBgLayout: "#F5F8FF",
    colorBorder: "#D7E3FF",
    fontSize: 16,
    fontFamily: `Prompt, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    borderRadius: 12,
  },
  components: {
    Button: {
      algorithm: true,
      controlHeight: 48,
      colorPrimary: "#1D4ED8",
      fontSize: 16,
      fontWeight: 600,
      borderRadius: 12,
    },
    Input: {
      borderRadius: 10,
      controlHeight: 46,
    },
    Select: {
      borderRadius: 10,
      controlHeight: 46,
    },
  },
};

export default theme;
