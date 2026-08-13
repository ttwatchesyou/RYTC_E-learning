// src/pages/dashboard/admin.tsx
import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Table,
  Switch,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  Card,
  Popconfirm,
  message,
  Image,
  Spin,
  Tag,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  StarOutlined,
  PictureOutlined,
  TrophyOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import MainLayout from "@/components/MainLayout";
import styled from "styled-components";
import { apiClient } from "@/services/apiClient";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import Head from "next/head";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const GlassCard = styled.div`
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [carouselItems, setCarouselItems] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [reportsRes, showcaseRes, promoRes]: any = await Promise.all([
        apiClient.get("/reports"),
        apiClient.get("/public/showcase"),
        apiClient.get("/promotions"),
      ]);

      if (reportsRes?.data) setReports(reportsRes.data);
      if (showcaseRes?.data?.carousel)
        setCarouselItems(showcaseRes.data.carousel);
      if (promoRes?.data) setPromotions(promoRes.data);
    } catch (error: any) {
      message.error("ไม่สามารถโหลดข้อมูล Admin ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = Cookies.get("token");
    const role = Cookies.get("user_role");

    if (!token || role !== "admin") {
      message.error(
        "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้! กรุณาล็อกอินด้วยบัญชี Admin"
      );
      router.push("/admin/login");
      return;
    }

    loadAdminData();
  }, []);

  const handleToggleFeature = async (reportId: number, checked: boolean) => {
    try {
      await apiClient.patch(`/admin/reports/${reportId}/toggle-feature`, {
        is_featured: checked,
      });
      message.success(
        checked
          ? "นำผลงานไปแสดงที่หน้า Index แล้ว"
          : "ยกเลิกการแสดงผลหน้า Index แล้ว"
      );
      loadAdminData();
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    }
  };

  const handlePromotionAction = async (
    promotionId: number,
    status: "approved" | "rejected"
  ) => {
    try {
      await apiClient.patch(`/admin/promotions/${promotionId}/action`, {
        status,
      });
      message.success(
        status === "approved"
          ? "อนุมัติการเลื่อนขั้นสำเร็จ!"
          : "ปฏิเสธคำขอเรียบร้อยแล้ว"
      );
      loadAdminData();
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอนุมัติ");
    }
  };

  const handleAddCarousel = async (values: any) => {
    if (fileList.length === 0) {
      message.error("กรุณาแนบรูปภาพสไลด์");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description || "");
      formData.append("image", fileList[0].originFileObj);

      await apiClient.post("/admin/carousel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("เพิ่มภาพผลงานการแข่งขันสำเร็จ");
      setAddModalVisible(false);
      form.resetFields();
      setFileList([]);
      loadAdminData();
    } catch (error: any) {
      message.error(error.message || "ไม่สามารถเพิ่มสไลด์ได้");
    }
  };

  const handleDeleteCarousel = async (id: number) => {
    try {
      await apiClient.delete(`/admin/carousel/${id}`);
      message.success("ลบสไลด์เรียบร้อย");
      loadAdminData();
    } catch (error: any) {
      message.error(error.message || "ไม่สามารถลบสไลด์ได้");
    }
  };

  const reportColumns = [
    {
      title: "นักเรียน",
      dataIndex: "first_name",
      key: "first_name",
      render: (_: any, record: any) => (
        <div>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>
            {record.first_name} {record.last_name}
          </span>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            รหัส: {record.student_code} ({record.classroom})
          </div>
        </div>
      ),
    },
    {
      title: "วันที่รายงาน",
      dataIndex: "report_date",
      key: "report_date",
    },
    {
      title: "รายละเอียด",
      dataIndex: "details",
      key: "details",
      ellipsis: true,
    },
    {
      title: "โชว์หน้า Index หลัก",
      key: "is_featured",
      render: (_: any, record: any) => (
        <Switch
          checked={Boolean(record.is_featured)}
          onChange={(checked) => handleToggleFeature(record.id, checked)}
          checkedChildren="โชว์"
          unCheckedChildren="ซ่อน"
        />
      ),
    },
  ];

  const promotionColumns = [
    {
      title: "นักเรียน",
      dataIndex: "student_first_name",
      key: "student_first_name",
      render: (_: any, record: any) => (
        <div>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>
            {record.student_first_name} {record.student_last_name}
          </span>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            รหัส: {record.student_code} ({record.classroom})
          </div>
        </div>
      ),
    },
    {
      title: "อาจารย์ผู้เสนอเรื่อง",
      dataIndex: "teacher_first_name",
      key: "teacher_first_name",
      render: (_: any, record: any) => (
        <span>
          ครู{record.teacher_first_name} {record.teacher_last_name}
        </span>
      ),
    },
    {
      title: "Rank เสนอเปลี่ยน",
      key: "rank",
      render: (_: any, record: any) => (
        <span>
          <Tag color="blue">Lv.{record.current_rank}</Tag> ➔{" "}
          <Tag color="gold" style={{ fontWeight: 700 }}>
            Lv.{record.proposed_rank}
          </Tag>
        </span>
      ),
    },
    {
      title: "เหตุผล / ผลงาน",
      dataIndex: "reason",
      key: "reason",
    },
    {
      title: "การอนุมัติ",
      key: "action",
      render: (_: any, record: any) => {
        if (record.status === "pending") {
          return (
            <div style={{ display: "flex", gap: 6 }}>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                style={{ background: "#059669", border: "none" }}
                onClick={() => handlePromotionAction(record.id, "approved")}
              >
                อนุมัติเลื่อนขั้น
              </Button>
              <Button
                type="default"
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handlePromotionAction(record.id, "rejected")}
              >
                ปฏิเสธ
              </Button>
            </div>
          );
        }
        if (record.status === "approved")
          return <Tag color="success">อนุมัติแล้ว</Tag>;
        return <Tag color="error">ปฏิเสธแล้ว</Tag>;
      },
    },
  ];

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
        <meta property="og:title" content="Mechatronics and Robotics" />
      </Head>
      <MainLayout userName="แอดมินระบบ" rankLevel={999}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Spin size="large" />
          </div>
        ) : (
          <Container>
            {/* Section 1: พิจารณาเสนอเลื่อนขั้นนักเรียน */}
            <GlassCard style={{ border: "1px solid rgba(250, 204, 21, 0.55)" }}>
              <SectionTitle>
                <TrophyOutlined style={{ color: "#eab308" }} />{" "}
                พิจารณาคำขอเสนอเลื่อนขั้นนักเรียนจากอาจารย์ (
                {promotions.filter((p) => p.status === "pending").length}{" "}
                รายการค้างอยู่)
              </SectionTitle>
              <Table
                dataSource={promotions}
                columns={promotionColumns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            </GlassCard>

            {/* Section 2: Carousel Management */}
            <GlassCard>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <SectionTitle style={{ margin: 0 }}>
                  <PictureOutlined style={{ color: "#eab308" }} /> จัดการ
                  Carousel สไลด์ภาพผลงาน & รางวัลการแข่งขัน
                </SectionTitle>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  style={{
                    background: "#1d4ed8",
                    border: "1px solid #facc15",
                    borderRadius: 12,
                  }}
                  onClick={() => setAddModalVisible(true)}
                >
                  เพิ่มสไลด์ใหม่
                </Button>
              </div>

              <Row gutter={[16, 16]}>
                {carouselItems.map((item) => (
                  <Col xs={24} sm={12} md={8} key={item.id}>
                    <Card
                      cover={
                        <Image
                          height={160}
                          style={{ objectFit: "cover" }}
                          src={`${
                            process.env.NEXT_PUBLIC_API_URL ||
                            "http://localhost:3000"
                          }${item.image_url}`}
                          alt={item.title}
                        />
                      }
                      actions={[
                        <Popconfirm
                          key="delete"
                          title="ยืนยันการลบสไลด์นี้?"
                          onConfirm={() => handleDeleteCarousel(item.id)}
                        >
                          <DeleteOutlined style={{ color: "#ef4444" }} />
                        </Popconfirm>,
                      ]}
                    >
                      <Card.Meta
                        title={item.title}
                        description={item.description}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </GlassCard>

            {/* Section 3: Featured Journals Selection */}
            <GlassCard>
              <SectionTitle>
                <StarOutlined style={{ color: "#eab308" }} />{" "}
                เลือกผลงานปฏิบัติงานประจำวันของนักเรียนไปโชว์หน้าแรก
              </SectionTitle>
              <Table
                dataSource={reports}
                columns={reportColumns}
                rowKey="id"
                pagination={{ pageSize: 6 }}
              />
            </GlassCard>

            <Modal
              title="เพิ่มสไลด์ผลงาน / รางวัลใหม่"
              open={addModalVisible}
              onCancel={() => setAddModalVisible(false)}
              footer={null}
              centered
            >
              <Form form={form} layout="vertical" onFinish={handleAddCarousel}>
                <Form.Item
                  label="ชื่อรางวัล / ผลงานการแข่งขัน"
                  name="title"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="เช่น รางวัลชนะเลิศ หุ่นยนต์กู้ภัยระดับชาติ 2026" />
                </Form.Item>
                <Form.Item label="คำอธิบายเพิ่มเติม" name="description">
                  <Input.TextArea
                    rows={3}
                    placeholder="รายละเอียดหรือสถานที่จัดงาน..."
                  />
                </Form.Item>
                <Form.Item label="รูปภาพสไลด์ (1 รูป)" required>
                  <Upload
                    listType="picture-card"
                    maxCount={1}
                    fileList={fileList}
                    beforeUpload={() => false}
                    onChange={({ fileList }) => setFileList(fileList)}
                  >
                    {fileList.length < 1 && "+ เลือกรูป"}
                  </Upload>
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  style={{
                    background: "#1d4ed8",
                    borderRadius: 12,
                    height: 46,
                  }}
                >
                  บันทึกสไลด์
                </Button>
              </Form>
            </Modal>
          </Container>
        )}
      </MainLayout>
    </>
  );
}
