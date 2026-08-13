// src/components/MainLayout.tsx
import React, { ReactNode } from "react";
import { Layout, Avatar, Dropdown, Space, Tag, message } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import styled, { keyframes } from "styled-components";

const { Header, Content, Footer } = Layout;

const floatAnimation = keyframes`
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(25px, -20px) scale(1.05); }
`;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background: radial-gradient(
    circle at 50% -10%,
    #dbeafe 0%,
    #f8faff 45%,
    #fffbea 100%
  );
  font-family: "Prompt", -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
`;

const AmbientBlob1 = styled.div`
  position: fixed;
  top: -5%;
  left: 10%;
  width: min(500px, 80vw);
  height: min(500px, 80vw);
  background: radial-gradient(
    circle,
    rgba(191, 219, 254, 0.45) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  border-radius: 50%;
  filter: blur(80px);
  animation: ${floatAnimation} 16s infinite ease-in-out;
  pointer-events: none;
  z-index: 0;
`;

const AmbientBlob2 = styled.div`
  position: fixed;
  bottom: 5%;
  right: 5%;
  width: min(550px, 80vw);
  height: min(550px, 80vw);
  background: radial-gradient(
    circle,
    rgba(254, 240, 138, 0.35) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  border-radius: 50%;
  filter: blur(90px);
  animation: ${floatAnimation} 20s infinite ease-in-out reverse;
  pointer-events: none;
  z-index: 0;
`;

const StyledHeader = styled(Header)`
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 64px !important;
  line-height: 1.5 !important;
  background: rgba(255, 255, 255, 0.82) !important;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  padding: 0 24px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);

  @media (max-width: 576px) {
    padding: 0 12px !important;
  }
`;

const LogoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const LogoIcon = styled.div`
  width: 34px;
  height: 34px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #facc15;
  font-weight: 700;
  font-size: 16px;
  border: 1px solid rgba(250, 204, 21, 0.55);
`;

const BrandText = styled.div`
  color: #0f172a;
  font-weight: 700;
  font-size: clamp(0.95rem, 3.5vw, 1.1rem);

  span {
    color: #eab308;
  }
`;

const UserProfileBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  height: 36px;
  padding: 0 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(250, 204, 21, 0.55);
  transition: all 0.2s ease;

  &:hover {
    background: #ffffff;
    border-color: #facc15;
  }
`;

const UserNameText = styled.span`
  color: #0f172a;
  font-weight: 600;
  font-size: 0.82rem;

  @media (max-width: 480px) {
    display: none;
  }
`;

const StyledContent = styled(Content)`
  padding: 24px 20px;
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;

  @media (max-width: 576px) {
    padding: 16px 12px;
  }
`;

interface MainLayoutProps {
  children: ReactNode;
  userName?: string;
  rankLevel?: number;
}

export default function MainLayout({
  children,
  userName = "ผู้ใช้งาน",
  rankLevel = 1,
}: MainLayoutProps) {
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("user_role");
    localStorage.removeItem("user");
    message.success("ออกจากระบบเรียบร้อยแล้ว");
    router.push("/login");
  };

  const userMenuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#ef4444" }} />,
      label: <span style={{ color: "#ef4444" }}>ออกจากระบบ</span>,
      onClick: handleLogout,
    },
  ];

  return (
    <StyledLayout>
      <AmbientBlob1 />
      <AmbientBlob2 />

      <StyledHeader>
        <LogoBox onClick={() => router.push("/")}>
          <LogoIcon>W</LogoIcon>
          <BrandText>
            WIL <span>Progression</span>
          </BrandText>
        </LogoBox>

        <Space size={8} style={{ display: "flex", alignItems: "center" }}>
          <Tag
            icon={<TrophyOutlined style={{ color: "#facc15" }} />}
            style={{
              background: "#1d4ed8",
              color: "#ffffff",
              border: "1px solid #facc15",
              borderRadius: 14,
              padding: "0 8px",
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              fontSize: 11,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Rank Lv.{rankLevel}
          </Tag>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <UserProfileBox>
              <Avatar
                size={24}
                style={{
                  backgroundColor: "#1d4ed8",
                  border: "1px solid #facc15",
                  color: "#facc15",
                  fontSize: 11,
                }}
                icon={<UserOutlined />}
              />
              <UserNameText>{userName}</UserNameText>
            </UserProfileBox>
          </Dropdown>
        </Space>
      </StyledHeader>

      <StyledContent>{children}</StyledContent>

      <Footer
        style={{
          textAlign: "center",
          background: "transparent",
          color: "#64748b",
          fontSize: 12,
          padding: "16px 12px",
          position: "relative",
          zIndex: 1,
        }}
      >
        WIL Progression System &copy; {new Date().getFullYear()} — Mechatronics
        Rayong Tech
      </Footer>
    </StyledLayout>
  );
}
