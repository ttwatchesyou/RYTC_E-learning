// src/pages/index.tsx
import React from "react";
import { Button, Row, Col, Tag, Card } from "antd";
import {
  RocketOutlined,
  CrownOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  BlockOutlined,
} from "@ant-design/icons";
import Head from "next/head";
import { useRouter } from "next/router";
import styled, { createGlobalStyle, keyframes } from "styled-components";

// ---------------------------------------------------------
// 🎭 ANIMATIONS & STYLED COMPONENTS
// ---------------------------------------------------------

const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  background: radial-gradient(
    circle at 50% -10%,
    #0f172a 0%,
    #1e293b 45%,
    #020617 100%
  );
  color: #f8fafc;
  font-family: "Prompt", -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const HeaderNavbar = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 48px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 576px) {
    padding: 16px 20px;
    flex-direction: column;
    gap: 16px;
  }
`;

const LogoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex-shrink: 0;
`;

const LogoIcon = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #38bdf8 0%, #312e81 100%);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
  font-weight: 800;
  font-size: 24px;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);
`;

const HeroContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 24px 20px;
  text-align: center;
  width: 100%;
`;

const MainTitle = styled.h1`
  font-size: clamp(1.8rem, 6vw, 4rem);
  font-weight: 900;
  line-height: 1.2;
  margin-bottom: 20px;
  color: #ffffff;

  span.highlight {
    background: linear-gradient(135deg, #38bdf8 0%, #a855f7 50%, #facc15 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const SubTitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: #94a3b8;
  max-width: 700px;
  margin: 0 auto 40px;
  line-height: 1.6;
`;

const HeroActionButton = styled(Button)`
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  font-weight: 600;
  padding: 0 28px;
  transition: all 0.3s ease;
  white-space: nowrap;

  &.btn-primary {
    background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%) !important;
    border: none !important;
    color: white !important;
    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(37, 99, 235, 0.6);
      filter: brightness(1.1);
    }
  }
`;

const FeatureGrid = styled.div`
  max-width: 1200px;
  margin: 40px auto 80px;
  padding: 0 24px;
  width: 100%;
`;

const FeatureCard = styled(Card)`
  background: rgba(30, 41, 59, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  backdrop-filter: blur(20px);
  text-align: center;
  height: 100%;
  animation: ${floatAnimation} 6s infinite ease-in-out;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;

  &:nth-child(1) { animation-delay: 0s; }
  &:nth-child(2) { animation-delay: 1s; }
  &:nth-child(3) { animation-delay: 2s; }

  &:hover {
    transform: translateY(-12px) scale(1.02);
    border-color: rgba(56, 189, 248, 0.5) !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(56, 189, 248, 0.1);
  }

  .ant-card-body {
    padding: 32px 24px !important;
  }

  .icon-wrapper {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    margin: 0 auto 20px;
  }

  h3 {
    color: #f8fafc;
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 12px;
  }

  p {
    color: #94a3b8;
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
  }
`;
const GlobalStyle = createGlobalStyle`
  body, html {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    background-color: #09090b !important; /* พื้นดำสนิท */
    overflow-x: hidden;
  }
  #__next {
    min-height: 100vh;
  }
` as unknown as React.ComponentType<any>;

// ---------------------------------------------------------
// ⚙️ MAIN COMPONENT
// ---------------------------------------------------------

export default function Home() {
  const router = useRouter();

  // ฟังก์ชันลัดสำหรับพุ่งไปยัง 3 ห้องจำลอง
  const goTo = (path: string) => {
    router.push(path);
  };

  return (
    <>
      <Head>
        <title>RYTC Mechatronics Virtual Labs</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
      </Head>
<GlobalStyle />
      <PageContainer>
        {/* แถบเมนูด้านบน */}
        <HeaderNavbar>
          <LogoBox onClick={() => goTo("/")}>
            <LogoIcon>M</LogoIcon>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.1 }}>
                RYTC <span style={{ color: "#38bdf8" }}>Mechatronics</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>
                Interactive Virtual Laboratories
              </div>
            </div>
          </LogoBox>
        </HeaderNavbar>

        {/* ส่วนข้อความต้อนรับหลัก */}
        <HeroContainer>
          <Tag
            color="blue"
            icon={<CrownOutlined />}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              marginBottom: 24,
              background: "rgba(56, 189, 248, 0.1)",
              borderColor: "rgba(56, 189, 248, 0.3)",
              color: "#38bdf8",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            วิทยาลัยเทคนิคระยอง (Rayong Technical College)
          </Tag>
          
          <MainTitle>
            ระบบศูนย์ปฏิบัติการเสมือนจริง <br />
            <span className="highlight">Interactive Virtual Labs</span>
          </MainTitle>
          
          <SubTitle>
            แพลตฟอร์มห้องปฏิบัติการจำลองสำหรับนักศึกษาสาขาวิชาเมคคาทรอนิกส์และหุ่นยนต์ 
            ฝึกฝนทักษะการเขียนโปรแกรม, ควบคุมระบบอัตโนมัติ, และการออกแบบ 3 มิติ ได้จากทุกที่
          </SubTitle>
        </HeroContainer>

        {/* การ์ดเมนู 3 ห้องปฏิบัติการ */}
        <FeatureGrid>
          <Row gutter={[24, 24]} justify="center">
            
            {/* 1. Linux OS Simulator */}
            <Col xs={24} sm={12} md={8}>
              <FeatureCard onClick={() => goTo("/Linuxsim")}>
                <div className="icon-wrapper" style={{ color: "#a855f7", borderColor: "rgba(168, 85, 247, 0.2)", background: "linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(56,189,248,0.1) 100%)" }}>
                  <CodeOutlined />
                </div>
                <h3>Mecharayong OS (Linux)</h3>
                <p>
                  ฝึกพิมพ์คำสั่ง Linux Command Line บนระบบปฏิบัติการจำลองเสมือนจริง
                  เรียนรู้โครงสร้างโฟลเดอร์และการควบคุมเซิร์ฟเวอร์เบื้องต้น
                </p>
                <HeroActionButton className="btn-primary" style={{ width: "100%", marginTop: 20, height: 40, fontSize: "0.9rem" }}>
                  เข้าห้องปฏิบัติการ
                </HeroActionButton>
              </FeatureCard>
            </Col>

            {/* 2. PLC Simulator */}
            <Col xs={24} sm={12} md={8}>
              <FeatureCard onClick={() => goTo("/PLCsim")}>
                <div className="icon-wrapper" style={{ color: "#facc15", borderColor: "rgba(250, 204, 21, 0.2)", background: "linear-gradient(135deg, rgba(250,204,21,0.1) 0%, rgba(239,68,68,0.1) 100%)" }}>
                  <ThunderboltOutlined />
                </div>
                <h3>PLC Control Simulator</h3>
                <p>
                  จำลองการเขียนโปรแกรมและทดสอบระบบควบคุมตรรกะแบบโปรแกรมได้ (PLC)
                  สำหรับการควบคุมเครื่องจักรและสายการผลิตอัตโนมัติ
                </p>
                <HeroActionButton className="btn-primary" style={{ width: "100%", marginTop: 20, height: 40, fontSize: "0.9rem" }}>
                  เข้าห้องปฏิบัติการ
                </HeroActionButton>
              </FeatureCard>
            </Col>

            {/* 3. 3D Design Simulator */}
            <Col xs={24} sm={12} md={8}>
              <FeatureCard onClick={() => goTo("/3D_Design")}>
                <div className="icon-wrapper" style={{ color: "#10b981", borderColor: "rgba(16, 185, 129, 0.2)", background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(56,189,248,0.1) 100%)" }}>
                  <BlockOutlined />
                </div>
                <h3>3D Design & Assembly</h3>
                <p>
                  พื้นที่จำลองสำหรับการออกแบบ สร้างโมเดล 3 มิติ และทดสอบการประกอบชิ้นส่วน
                  ทางกลศาสตร์และโครงสร้างหุ่นยนต์
                </p>
                <HeroActionButton className="btn-primary" style={{ width: "100%", marginTop: 20, height: 40, fontSize: "0.9rem" }}>
                  เข้าห้องปฏิบัติการ
                </HeroActionButton>
              </FeatureCard>
            </Col>

          </Row>
        </FeatureGrid>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "24px",
            color: "#64748b",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            background: "rgba(15, 23, 42, 0.8)",
            fontSize: "0.85rem",
          }}
        >
          RYTC Mechatronics Virtual Labs &copy; {new Date().getFullYear()} —
          สาขาวิชาเมคคาทรอนิกส์และหุ่นยนต์ วิทยาลัยเทคนิคระยอง
        </footer>
      </PageContainer>
    </>
  );
}