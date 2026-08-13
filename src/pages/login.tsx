// src/pages/login.tsx
import React, { useState } from "react";
import { Form, Input, Button, Modal, message } from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/router";
import styled, { keyframes } from "styled-components";
import { authService } from "@/services/authService";
import Cookies from "js-cookie";
import Head from "next/head";

const floatBlob = keyframes`
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(-25px, 20px) scale(1.05); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  background: radial-gradient(
    circle at 50% -10%,
    #dbeafe 0%,
    #f8faff 45%,
    #fffbea 100%
  );
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  font-family: "Prompt", -apple-system, sans-serif;
`;

const AmbientBlob1 = styled.div`
  position: absolute;
  top: 10%;
  right: 15%;
  width: 550px;
  height: 550px;
  background: radial-gradient(
    circle,
    rgba(191, 219, 254, 0.5) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  border-radius: 50%;
  filter: blur(80px);
  animation: ${floatBlob} 14s infinite ease-in-out;
  pointer-events: none;
`;

const AmbientBlob2 = styled.div`
  position: absolute;
  bottom: 10%;
  left: 10%;
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle,
    rgba(254, 240, 138, 0.4) 0%,
    rgba(255, 255, 255, 0) 70%
  );
  border-radius: 50%;
  filter: blur(90px);
  animation: ${floatBlob} 18s infinite ease-in-out reverse;
  pointer-events: none;
`;

const LoginCard = styled.div`
  width: 100%;
  max-width: 460px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(30px) saturate(200%);
  -webkit-backdrop-filter: blur(30px) saturate(200%);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02);
  position: relative;
  z-index: 10;

  @media (max-width: 576px) {
    padding: 28px 20px;
    border-radius: 20px;
  }
`;

const HeaderBox = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const LogoBox = styled.div`
  width: 58px;
  height: 58px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  border-radius: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #facc15;
  font-weight: 700;
  font-size: 28px;
  margin: 0 auto 16px;
  border: 1px solid rgba(250, 204, 21, 0.55);
  box-shadow: 0 10px 20px rgba(29, 78, 216, 0.24);
`;

const BrandTitle = styled.h1`
  color: #0f172a;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 6px 0;

  span {
    color: #eab308;
  }
`;

const BrandSubtitle = styled.p`
  color: #64748b;
  font-size: 0.82rem;
  margin: 0;
  line-height: 1.5;
`;

const ForgotPasswordLink = styled.div`
  text-align: right;
  margin-bottom: 18px;

  a {
    color: #eab308;
    font-size: 0.85rem;
    font-weight: 500;

    &:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
  }
`;

const SubmitButton = styled(Button)`
  height: 48px !important;
  border-radius: 14px !important;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%) !important;
  border: 1px solid rgba(250, 204, 21, 0.55) !important;
  box-shadow: 0 8px 20px rgba(29, 78, 216, 0.28) !important;
  color: #ffffff !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  width: 100%;
  transition: all 0.3s ease !important;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(29, 78, 216, 0.36) !important;
    color: #fef08a !important;
  }
`;

const RegisterFooter = styled.div`
  text-align: center;
  margin-top: 24px;
  font-size: 0.9rem;
  color: #64748b;

  a {
    color: #1d4ed8;
    font-weight: 600;

    &:hover {
      color: #eab308;
    }
  }
`;

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotForm] = Form.useForm();

  const onLogin = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await authService.login(values);

      Cookies.set("token", res.token, { expires: 7 });
      Cookies.set("user_role", res.user.role, { expires: 7 });
      localStorage.setItem("user", JSON.stringify(res.user));

      message.success("เข้าสู่ระบบสำเร็จ");
      if (res.user.role === "admin") router.push("/dashboard/admin");
      else if (res.user.role === "teacher") router.push("/dashboard/teacher");
      else router.push("/dashboard/student");
    } catch (error: any) {
      message.error(error.message || "Username หรือ Password ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async (values: any) => {
    setForgotLoading(true);
    try {
      await authService.forgotPassword(values.email);
      message.success("ส่งคำขอเรียบร้อยแล้ว");
      setForgotModalVisible(false);
      forgotForm.resetFields();
    } catch (error: any) {
      message.error(error.message || "ไม่พบอีเมลนี้ในระบบ");
    } finally {
      setForgotLoading(false);
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
        <AmbientBlob1 />
        <AmbientBlob2 />
        <LoginCard>
          <HeaderBox>
            <LogoBox>W</LogoBox>
            <BrandTitle>
              WIL <span>Progression</span>
            </BrandTitle>
            <BrandSubtitle>
              Mechatronics And Robotics Rayong Technical College <br />
              โครงการ WIL แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์
            </BrandSubtitle>
          </HeaderBox>

          <Form layout="vertical" onFinish={onLogin} requiredMark={false}>
            <Form.Item
              label="Username / อีเมล"
              name="username"
              rules={[
                { required: true, message: "กรุณากรอก Username หรือ อีเมล" },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#1d4ed8" }} />}
                placeholder="66301234"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="รหัสผ่าน"
              name="password"
              rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#1d4ed8" }} />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <ForgotPasswordLink>
              <a onClick={() => setForgotModalVisible(true)}>ลืมรหัสผ่าน?</a>
            </ForgotPasswordLink>

            <SubmitButton type="primary" htmlType="submit" loading={loading}>
              เข้าสู่ระบบ
            </SubmitButton>
          </Form>

          <RegisterFooter>
            ยังไม่มีบัญชี? <Link href="/register">ลงทะเบียนใช้งาน</Link>
          </RegisterFooter>
        </LoginCard>

        <Modal
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#1d4ed8",
              }}
            >
              <KeyOutlined style={{ color: "#eab308" }} /> ลืมรหัสผ่าน
            </div>
          }
          open={forgotModalVisible}
          onCancel={() => setForgotModalVisible(false)}
          footer={null}
          centered
        >
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
            กรอกอีเมลที่คุณใช้ลงทะเบียนเพื่อติดต่อขอตั้งรหัสผ่านใหม่
          </p>
          <Form form={forgotForm} layout="vertical" onFinish={onForgotPassword}>
            <Form.Item
              label="อีเมลของคุณ"
              name="email"
              rules={[
                { required: true, message: "กรุณากรอกอีเมล" },
                { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="student@rayongtech.ac.th"
                size="large"
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={forgotLoading}
              block
              size="large"
              style={{
                borderRadius: 12,
                background: "#1d4ed8",
                border: "1px solid #facc15",
                height: 46,
              }}
            >
              ส่งคำขอตั้งรหัสผ่านใหม่
            </Button>
          </Form>
        </Modal>
      </PageContainer>
    </>
  );
}
