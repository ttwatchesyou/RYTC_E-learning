import type { AppProps } from "next/app";
import { ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import theme from "../config/theme"; // 
// หากมีไฟล์ globals.css อยู่ในโฟลเดอร์ src/styles ให้ใช้บรรทัดล่างนี้ (ถ้าไม่มีให้ลบออก)


export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider locale={thTH} theme={theme}>
      <Component {...pageProps} />
    </ConfigProvider>
  );
}