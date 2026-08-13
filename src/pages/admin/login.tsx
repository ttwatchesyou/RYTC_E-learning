import React, { useState } from "react";
import { Form, Input, Button, message } from "antd";
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import styled from "styled-components";
import { apiClient } from "@/services/apiClient";
import Cookies from "js-cookie";
import Head from "next/head";

const PageContainer = styled.div`
  min-height: 100vh;
  background: radial-gradient(
    circle at 50% -10%,
    #1e3a8a 0%,
    #102b66 50%,
    #071a42 100%
  );
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  font-family: "Prompt", -apple-system, sans-serif;
  position: relative;
  overflow: hidden;
`;

const AdminCard = styled.div`
  width: 100%;
  max-width: 420px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(30px) saturate(200%);
  -webkit-backdrop-filter: blur(30px) saturate(200%);
  border-radius: 28px;
  border: 1px solid rgba(250, 204, 21, 0.55);
  padding: 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 10;
`;

const HeaderBox = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const ShieldIconBox = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #facc15;
  font-size: 32px;
  margin: 0 auto 16px;
  border: 1px solid rgba(250, 204, 21, 0.65);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
`;

const Title = styled.h1`
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 6px 0;

  span {
    color: #facc15;
  }
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 0.82rem;
  margin: 0;
`;

const StyledInputWrapper = styled.div`
  .ant-input-affix-wrapper {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    border-radius: 14px !important;

    input {
      background: transparent !important;
      color: #ffffff !important;

      &::placeholder {
        color: #64748b !important;
      }
    }

    &:hover,
    &:focus-within {
      border-color: #facc15 !important;
    }
  }

  .ant-form-item-label > label {
    color: #e2e8f0 !important;
    font-weight: 500 !important;
  }
`;

const SubmitButton = styled(Button)`
  height: 50px !important;
  border-radius: 14px !important;
  background: linear-gradient(135deg, #facc15 0%, #eab308 100%) !important;
  border: none !important;
  color: #172554 !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  width: 100%;
  margin-top: 12px;
  box-shadow: 0 10px 24px rgba(250, 204, 21, 0.34) !important;
  transition: all 0.3s ease !important;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(250, 204, 21, 0.48) !important;
  }
`;

export default function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onAdminLogin = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await apiClient.post("/admin/login", values);

      Cookies.set("token", res.token, { expires: 1 });
      Cookies.set("user_role", "admin", { expires: 1 });
      localStorage.setItem("user", JSON.stringify(res.user));

      message.success("ยินดีต้อนรับ ผู้ดูแลระบบ (Admin)");
      router.push("/dashboard/admin");
    } catch (error: any) {
      message.error(error.message || "Username หรือ Password แอดมินไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
        <meta property="og:title" content="Mechatronics and Robotics" />
      </Head>
      <PageContainer>
        <AdminCard>
          <HeaderBox>
            <ShieldIconBox>
              <SafetyCertificateOutlined />
            </ShieldIconBox>
            <Title>
              ADMIN <span>CONTROL CENTER</span>
            </Title>
            <Subtitle>ระบบหลังบ้านผู้ดูแลระบบ WIL Progression</Subtitle>
          </HeaderBox>

          <Form layout="vertical" onFinish={onAdminLogin} requiredMark={false}>
            <StyledInputWrapper>
              <Form.Item
                label="Admin Username"
                name="username"
                rules={[
                  { required: true, message: "กรุณากรอก Username แอดมิน" },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "#facc15" }} />}
                  placeholder="admin"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Admin Password"
                name="password"
                rules={[
                  { required: true, message: "กรุณากรอก Password แอดมิน" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#facc15" }} />}
                  placeholder="••••••••"
                  size="large"
                />
              </Form.Item>
            </StyledInputWrapper>

            <SubmitButton type="primary" htmlType="submit" loading={loading}>
              เข้าสู่ระบบแอดมิน
            </SubmitButton>
          </Form>
        </AdminCard>
      </PageContainer>
    </>
  );
}
