// src/pages/index.tsx
import React, { useEffect, useState } from "react";
import { Button, Row, Col, Tag, Carousel, Image } from "antd";
import {
  RocketOutlined,
  LoginOutlined,
  CrownOutlined,
  FireOutlined,
} from "@ant-design/icons";
import Head from "next/head";
import { useRouter } from "next/router";
import styled, { keyframes } from "styled-components";
import Cookies from "js-cookie";
import { apiClient } from "@/services/apiClient";

const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  background: radial-gradient(
    circle at 50% -10%,
    #dbeafe 0%,
    #f8faff 45%,
    #fffbea 100%
  );
  color: #0f172a;
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
    padding: 16px 20px; /* ลด Padding บนมือถือ */
    gap: 12px;
  }
`;

const LogoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  flex-shrink: 0; /* ป้องกันโลโก้ถูกบีบ */
`;

const LogoIcon = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #facc15;
  font-weight: 700;
  font-size: 22px;

  @media (max-width: 576px) {
    width: 36px;
    height: 36px;
    font-size: 18px;
    border-radius: 10px;
  }
`;

const HeroContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 24px 40px;
  text-align: center;
  width: 100%;
`;

const MainTitle = styled.h1`
  font-size: clamp(1.4rem, 6vw, 3.5rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 16px;
  color: #0f172a;

  @media (max-width: 576px) {
    line-height: 1.35;
    margin-bottom: 12px;
    word-break: break-word;
  }

  span.highlight {
    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #facc15 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const StyledCarouselWrapper = styled.div`
  max-width: 1100px;
  margin: 0 auto 50px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(29, 78, 216, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.9);

  .slick-slide img {
    width: 100%;
    height: 420px;
    object-fit: cover;

    @media (max-width: 576px) {
      height: 240px;
    }
  }
`;

const CarouselContent = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(30, 64, 175, 0.92) 100%
  );
  padding: 30px 40px;
  color: #ffffff;
  text-align: left;
`;

const FloatingGlassCard = styled.div`
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  padding: 20px;
  height: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  animation: ${floatAnimation} 6s infinite ease-in-out;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 18px 36px rgba(29, 78, 216, 0.12);
  }
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;

  h2 {
    font-size: 1.8rem;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
  }
  p {
    color: #64748b;
  }
`;

const HeroActionButton = styled(Button)`
  background: #1d4ed8 !important;
  border: 1px solid #facc15 !important;
  color: white !important;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  padding: 0 24px;
  box-shadow: 0 4px 14px rgba(29, 78, 216, 0.28);
  transition: all 0.3s ease;
  white-space: nowrap; /* ป้องกันข้อความในปุ่มขึ้นบรรทัดใหม่ */

  &:hover {
    background: #1e40af !important;
    border-color: #facc15 !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(250, 204, 21, 0.32);
  }

  @media (max-width: 576px) {
    height: 38px;
    padding: 0 12px;
    font-size: 0.85rem;
    border-radius: 10px;
  }
`;

// สร้างตัวครอบปุ่ม (Container) เพื่อให้หน้าจอมือถือมีขอบเว้นระยะสวยงาม
const ActionButtonContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
`;

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showcaseData, setShowcaseData] = useState<{
    carousel: any[];
    featured_journals: any[];
  }>({
    carousel: [],
    featured_journals: [],
  });

  useEffect(() => {
    if (Cookies.get("token")) setIsLoggedIn(true);

    apiClient
      .get("/public/showcase")
      .then((res: any) => {
        if (res?.data) setShowcaseData(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
        <meta property="og:title" content="Mechatronics and Robotics" />
      </Head>
      <PageContainer>
        <HeaderNavbar>
          <LogoBox onClick={() => router.push("/")}>
            <LogoIcon>W</LogoIcon>
            <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>
              WIL <span style={{ color: "#eab308" }}>Progression</span>
            </div>
          </LogoBox>

          <ActionButtonContainer>
            {isLoggedIn ? (
              <HeroActionButton
                type="primary"
                icon={<RocketOutlined />}
                onClick={() => router.push("/dashboard/student")}
              >
                ไปยัง Dashboard
              </HeroActionButton>
            ) : (
              <HeroActionButton
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => router.push("/login")}
              >
                เข้าสู่ระบบ
              </HeroActionButton>
            )}
          </ActionButtonContainer>
        </HeaderNavbar>

        <HeroContainer>
          <Tag
            color="gold"
            icon={<CrownOutlined />}
            style={{ padding: "6px 16px", borderRadius: 20, marginBottom: 16 }}
          >
            โครงการ WIL แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์
          </Tag>
          <MainTitle>
            ผลงานและทักษะปฏิบัติงานจริง <br />
            <span className="highlight">เมคคาทรอนิกส์และหุ่นยนต์</span>
          </MainTitle>
        </HeroContainer>

        {/* 🏆 Carousel ผลงาน / รางวัลการแข่งขัน (ซ่อนอัตโนมัติหากไม่มีข้อมูล) */}
        {showcaseData.carousel && showcaseData.carousel.length > 0 && (
          <StyledCarouselWrapper>
            <Carousel autoplay effect="fade">
              {showcaseData.carousel.map((slide) => (
                <div key={slide.id} style={{ position: "relative" }}>
                  <img
                    src={`${
                      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
                    }${slide.image_url}`}
                    alt={slide.title}
                  />
                  <CarouselContent>
                    <h3
                      style={{
                        color: "#facc15",
                        fontSize: "1.4rem",
                        margin: 0,
                      }}
                    >
                      {slide.title}
                    </h3>
                    <p style={{ margin: "4px 0 0 0", color: "#cbd5e1" }}>
                      {slide.description}
                    </p>
                  </CarouselContent>
                </div>
              ))}
            </Carousel>
          </StyledCarouselWrapper>
        )}

        {/* ⚡ Floating Glass Cards (ซ่อนทั้งส่วนอัตโนมัติหากไม่มีผลงานถูกเลือก) */}
        {showcaseData.featured_journals &&
          showcaseData.featured_journals.length > 0 && (
            <div
              style={{
                maxWidth: 1200,
                margin: "0 auto 60px",
                padding: "0 24px",
                width: "100%",
              }}
            >
              <SectionHeader>
                <h2>
                  <FireOutlined style={{ color: "#eab308" }} />{" "}
                  ผลงานการปฏิบัติงานรายวัน (Featured WIL Journals)
                </h2>
                <p>บันทึกการทำงานจริงในสนามจากนักเรียนโครงการ WIL</p>
              </SectionHeader>

              <Row gutter={[20, 20]}>
                {showcaseData.featured_journals.map((item) => {
                  let images: string[] = [];
                  try {
                    images = JSON.parse(item.image_url);
                  } catch {}

                  return (
                    <Col xs={24} sm={12} md={8} key={item.id}>
                      <FloatingGlassCard>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                            {item.first_name} {item.last_name}
                          </span>
                          <Tag color="gold">Rank Lv.{item.rank_level}</Tag>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginBottom: 8,
                          }}
                        >
                          วันที่: {item.report_date} ({item.classroom})
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            color: "#334155",
                            minHeight: 40,
                          }}
                        >
                          {item.details}
                        </p>

                        {images.length > 0 && (
                          <Image
                            height={140}
                            width="100%"
                            style={{ objectFit: "cover", borderRadius: 12 }}
                            src={`${
                              process.env.NEXT_PUBLIC_API_URL ||
                              "http://localhost:3000"
                            }${images[0]}`}
                            alt="ภาพการปฏิบัติงาน"
                          />
                        )}
                      </FloatingGlassCard>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

        <footer
          style={{
            textAlign: "center",
            padding: 24,
            color: "#64748b",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          WIL Progression System &copy; {new Date().getFullYear()} —
          Mechatronics And Robotics Rayong Technical College | โครงการ WIL
          แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์
        </footer>
      </PageContainer>
    </>
  );
}
