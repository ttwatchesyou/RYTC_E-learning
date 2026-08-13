import React, { useState, useEffect } from "react";
import { Form, Input, DatePicker, Button, Upload, message, Alert } from "antd";
import { FormOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import MainLayout from "@/components/MainLayout";
import styled from "styled-components";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import { reportService } from "@/services/reportService";
import Head from "next/head";

const { TextArea } = Input;

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
`;

const GlassCard = styled.div`
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(28px) saturate(200%);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  padding: 36px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
`;

export default function NewJournal() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {}
    }
  }, []);

  const disabledDate = (current: dayjs.Dayjs) => {
    const day = current.day();
    return day === 0 || day === 6; // ห้ามเลือกเสาร์-อาทิตย์
  };

  const onFinish = async (values: any) => {
    const dayOfWeek = values.report_date.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      message.error("ยกเว้นการส่งรายงานในวันเสาร์และวันอาทิตย์");
      return;
    }

    if (fileList.length < 1) {
      message.error("กรุณาแนบรูปภาพการปฏิบัติงานอย่างน้อย 1 รูป");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("student_id", currentUser.id.toString());
      formData.append("report_date", values.report_date.format("YYYY-MM-DD"));
      formData.append("details", values.details);

      fileList.forEach((file) => {
        if (file.originFileObj) formData.append("images", file.originFileObj);
      });

      await reportService.createReport(formData);
      message.success("บันทึกสำเร็จ! คุณได้รับ +10 EXP ทันที 🎉");
      router.push("/dashboard/student");
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการส่งรายงาน");
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
      <MainLayout
        userName={
          currentUser
            ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`
            : "นักเรียน"
        }
      >
        <Container>
          <GlassCard>
            <div
              style={{
                marginBottom: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, color: "#0f172a" }}>
                <FormOutlined style={{ color: "#eab308" }} />{" "}
                บันทึกรายงานประจำวัน (WIL Journal)
              </h2>
              <Button
                icon={<ArrowLeftOutlined />}
                type="text"
                onClick={() => router.push("/dashboard/student")}
              >
                ย้อนกลับ
              </Button>
            </div>

            <Alert
              message="เงื่อนไขการส่งรายงานประจำวัน"
              description="เปิดให้ส่งเฉพาะวันจันทร์ - ศุกร์ (เสาร์-อาทิตย์ ยกเว้น) เมื่ออัปโหลดส่งรายงานปุ๊บ ระบบจะเพิ่มคะแนน +10 EXP ให้อัตโนมัติทันที!"
              type="info"
              showIcon
              style={{ marginBottom: 24, borderRadius: 12 }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ report_date: dayjs() }}
            >
              <Form.Item
                label="วันที่ปฏิบัติงาน (จันทร์ - ศุกร์)"
                name="report_date"
                rules={[{ required: true }]}
              >
                <DatePicker
                  disabledDate={disabledDate}
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="รายละเอียดการปฏิบัติงาน"
                name="details"
                rules={[{ required: true }]}
              >
                <TextArea
                  rows={6}
                  placeholder="อธิบายกิจกรรมและสิ่งที่ได้เรียนรู้ในวันนี้..."
                />
              </Form.Item>

              <Form.Item label="รูปภาพการปฏิบัติงาน (1-5 รูป)" required>
                <Upload
                  listType="picture-card"
                  multiple
                  maxCount={5}
                  fileList={fileList}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setFileList(fileList)}
                >
                  {fileList.length < 5 && "+ แนบรูปถ่าย"}
                </Upload>
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  background: "#1d4ed8",
                  border: "1px solid #facc15",
                  borderRadius: 12,
                  height: 48,
                  marginTop: 12,
                }}
              >
                บันทึกและรับ +10 EXP
              </Button>
            </Form>
          </GlassCard>
        </Container>
      </MainLayout>
    </>
  );
}
