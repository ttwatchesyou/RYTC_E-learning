// src/pages/register.tsx
import React, { useState } from "react";
import { Form, Input, Button, Select, message, Row, Col } from "antd";
import {
  MailOutlined,
  LockOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  IdcardOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/router";
import styled, { keyframes } from "styled-components";
import { authService, RegisterPayload } from "@/services/authService";
import Head from "next/head";

const floatBlob = keyframes`
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(35px, -25px) scale(1.1); }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  background: radial-gradient(circle at 50% 0%, #1e3a8a 0%, #071a42 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 16px;
  position: relative;
  overflow: hidden;
  font-family: "Prompt", sans-serif;
`;

const AmbientBlobNavy = styled.div`
  position: absolute;
  top: -5%;
  left: 10%;
  width: clamp(300px, 50vw, 650px);
  height: clamp(300px, 50vw, 650px);
  background: radial-gradient(
    circle,
    rgba(37, 99, 235, 0.5) 0%,
    rgba(29, 78, 216, 0) 70%
  );
  border-radius: 50%;
  filter: blur(80px);
  animation: ${floatBlob} 15s infinite ease-in-out;
  pointer-events: none;
`;

const AmbientBlobGold = styled.div`
  position: absolute;
  bottom: -5%;
  right: 10%;
  width: clamp(280px, 45vw, 550px);
  height: clamp(280px, 45vw, 550px);
  background: radial-gradient(
    circle,
    rgba(250, 204, 21, 0.25) 0%,
    rgba(29, 78, 216, 0) 70%
  );
  border-radius: 50%;
  filter: blur(90px);
  animation: ${floatBlob} 18s infinite ease-in-out reverse;
  pointer-events: none;
`;

const RegisterCard = styled.div`
  width: 100%;
  max-width: 640px;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(28px) saturate(200%);
  border-radius: 28px;
  border: 1px solid rgba(250, 204, 21, 0.5);
  padding: 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 10;

  @media (max-width: 576px) {
    padding: 24px 18px;
    border-radius: 20px;
  }
`;

const HeaderBox = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const BrandTitle = styled.h1`
  color: #ffffff;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 6px 0;
  font-family: "Prompt", sans-serif;

  span {
    color: #facc15;
    text-shadow: 0 0 12px rgba(250, 204, 21, 0.35);
  }
`;

const BrandSubtitle = styled.p`
  color: #94a3b8;
  font-size: 0.82rem;
  margin: 0;
  line-height: 1.5;
`;

const PasswordRulesContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px 16px;
  margin-top: 8px;
  margin-bottom: 16px;
  border: 1px solid rgba(250, 204, 21, 0.4);
`;

const RuleItem = styled.div<{ $passed: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: ${(props) => (props.$passed ? "#34d399" : "#94a3b8")};
  margin-bottom: 4px;
  transition: color 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SubmitButton = styled(Button)`
  height: 48px !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, #facc15 0%, #eab308 100%) !important;
  border: none !important;
  box-shadow: 0 8px 20px rgba(250, 204, 21, 0.34),
    inset 0 1px 1px rgba(255, 255, 255, 0.6) !important;
  color: #172554 !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  width: 100%;
  margin-top: 8px;
  transition: all 0.3s ease !important;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(250, 204, 21, 0.5) !important;
  }
`;

const BackLink = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  font-size: 0.9rem;
  color: #94a3b8;

  a {
    color: #facc15;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: color 0.2s ease;

    &:hover {
      color: #fef08a;
    }
  }
`;

const FormThemeWrapper = styled.div`
  .ant-form-item-label > label {
    color: #e2e8f0 !important;
    font-weight: 500 !important;
  }

  .ant-input-affix-wrapper,
  .ant-input-password {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    border-radius: 12px !important;

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

  .ant-input-disabled {
    background: rgba(255, 255, 255, 0.03) !important;
    color: #64748b !important;
  }

  .ant-select-selector {
    background: rgba(255, 255, 255, 0.08) !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    border-radius: 12px !important;
    color: #ffffff !important;
  }

  .ant-form-item-extra {
    color: #94a3b8 !important;
  }
`;

export default function Register() {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  const selectedRole = Form.useWatch("role", form) || "student";
  const isTeacher = selectedRole === "teacher";

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);

  const onFinish = async (values: any) => {
    if (!isPasswordValid) {
      message.error("กรุณากรอกรหัสผ่านให้ครบตามเงื่อนไขความปลอดภัย");
      return;
    }

    setLoading(true);
    try {
      const finalUsername = isTeacher
        ? values.email.trim()
        : values.username.trim();
      const finalStudentCode = isTeacher ? undefined : values.username.trim();

      const payload: RegisterPayload = {
        username: finalUsername,
        email: values.email.trim(),
        password: values.password,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        role: values.role,
        student_code: finalStudentCode,
        classroom: values.classroom?.trim() || undefined,
      };

      await authService.register(payload);
      message.success("สมัครสมาชิกสำเร็จ! บัญชีของคุณพร้อมใช้งานแล้ว");
      router.push("/login");
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
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
        <AmbientBlobNavy />
        <AmbientBlobGold />
        <RegisterCard>
          <HeaderBox>
            <BrandTitle>
              ลงทะเบียน <span>WIL Progression</span>
            </BrandTitle>
            <BrandSubtitle>
              Mechatronics And Robotics Rayong Technical College <br />
              โครงการ WIL แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์
            </BrandSubtitle>
          </HeaderBox>

          <FormThemeWrapper>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              initialValues={{ role: "student" }}
            >
              <Form.Item
                label="สถานะผู้ใช้งาน"
                name="role"
                rules={[{ required: true }]}
              >
                <Select size="large">
                  <Select.Option value="student">
                    👨‍🎓 นักเรียน / นักศึกษา (Student)
                  </Select.Option>
                  <Select.Option value="teacher">
                    👨‍🏫 อาจารย์ผู้สอน / ที่ปรึกษา (Teacher)
                  </Select.Option>
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="ชื่อจริง"
                    name="first_name"
                    rules={[{ required: true, message: "กรุณากรอกชื่อจริง" }]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: "#facc15" }} />}
                      placeholder="สมศักดิ์"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="นามสกุล"
                    name="last_name"
                    rules={[{ required: true, message: "กรุณากรอกนามสกุล" }]}
                  >
                    <Input placeholder="เรียนดี" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      isTeacher
                        ? "รหัสประจำตัวนักศึกษา (เฉพาะนักเรียน)"
                        : "รหัสประจำตัวนักศึกษา (Username)"
                    }
                    name="username"
                    getValueFromEvent={(e) =>
                      isTeacher
                        ? e.target.value
                        : e.target.value.replace(/\D/g, "")
                    }
                    rules={
                      isTeacher
                        ? []
                        : [
                            {
                              required: true,
                              message: "กรุณากรอกรหัสประจำตัวนักศึกษา",
                            },
                            {
                              pattern: /^[0-9]+$/,
                              message: "กรุณากรอกเฉพาะตัวเลขเท่านั้น",
                            },
                          ]
                    }
                    extra={
                      isTeacher
                        ? "อาจารย์ใช้อีเมลในการเข้าสู่ระบบ"
                        : "ใช้รหัสนี้เป็น Username ในการเข้าสู่ระบบ (เฉพาะตัวเลขเท่านั้น)"
                    }
                  >
                    <Input
                      prefix={<IdcardOutlined style={{ color: "#facc15" }} />}
                      placeholder={
                        isTeacher
                          ? "ไม่ต้องกรอก (สำหรับนักเรียนเท่านั้น)"
                          : "เช่น 66309010001"
                      }
                      disabled={isTeacher}
                      inputMode={isTeacher ? "text" : "numeric"}
                      pattern="[0-9]*"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="อีเมล (Email)"
                    name="email"
                    rules={[
                      { required: true, message: "กรุณากรอกอีเมล" },
                      { type: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: "#facc15" }} />}
                      placeholder="user@rayongtech.ac.th"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24}>
                  <Form.Item
                    label={
                      isTeacher
                        ? "ครูที่ปรึกษาประจำห้อง (ถ้ามี)"
                        : "ระดับชั้น / ห้องเรียน"
                    }
                    name="classroom"
                    rules={
                      isTeacher
                        ? []
                        : [{ required: true, message: "กรุณากรอกห้องเรียน" }]
                    }
                  >
                    <Input
                      prefix={<TeamOutlined style={{ color: "#facc15" }} />}
                      placeholder={
                        isTeacher
                          ? "เช่น ปวช.2/1 (เว้นว่างได้)"
                          : "เช่น ปวช.2/1 หรือ ปวส.1/2"
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="รหัสผ่าน (Password)"
                name="password"
                rules={[{ required: true, message: "กรุณากรอกรหัสผ่าน" }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#facc15" }} />}
                  placeholder="กำหนดรหัสผ่าน"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Item>

              {password && (
                <PasswordRulesContainer>
                  <RuleItem $passed={rules.length}>
                    {rules.length ? (
                      <CheckCircleFilled />
                    ) : (
                      <CloseCircleOutlined />
                    )}
                    ความยาวอย่างน้อย 8 ตัวอักษร
                  </RuleItem>
                  <RuleItem $passed={rules.uppercase}>
                    {rules.uppercase ? (
                      <CheckCircleFilled />
                    ) : (
                      <CloseCircleOutlined />
                    )}
                    มีตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว
                  </RuleItem>
                  <RuleItem $passed={rules.lowercase}>
                    {rules.lowercase ? (
                      <CheckCircleFilled />
                    ) : (
                      <CloseCircleOutlined />
                    )}
                    มีตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว
                  </RuleItem>
                  <RuleItem $passed={rules.number}>
                    {rules.number ? (
                      <CheckCircleFilled />
                    ) : (
                      <CloseCircleOutlined />
                    )}
                    มีตัวเลข (0-9) อย่างน้อย 1 ตัว
                  </RuleItem>
                </PasswordRulesContainer>
              )}

              <Form.Item
                label="ยืนยันรหัสผ่าน"
                name="confirm_password"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "กรุณายืนยันรหัสผ่าน" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("รหัสผ่านทั้งสองช่องไม่ตรงกัน")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#facc15" }} />}
                  placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                />
              </Form.Item>

              <SubmitButton type="primary" htmlType="submit" loading={loading}>
                สมัครสมาชิก
              </SubmitButton>
            </Form>
          </FormThemeWrapper>

          <BackLink>
            <span>มีบัญชีอยู่แล้ว?</span>
            <Link href="/login">
              <ArrowLeftOutlined /> เข้าสู่ระบบ
            </Link>
          </BackLink>
        </RegisterCard>
      </PageContainer>
    </>
  );
}
