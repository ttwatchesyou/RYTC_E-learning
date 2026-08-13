// src/pages/dashboard/teacher.tsx
import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tabs,
  Spin,
  message,
  Card,
  Image,
  Empty,
  DatePicker,
  Radio,
  Progress,
  Space,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  FileTextOutlined,
  SolutionOutlined,
  ReadOutlined,
  TrophyOutlined,
  SendOutlined,
  CalendarOutlined,
  SaveOutlined,
  UserOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  CrownOutlined,
  StarFilled,
  CameraOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import MainLayout from "@/components/MainLayout";
import styled from "styled-components";
import { teacherService } from "@/services/teacherService";
import {
  attendanceService,
  AttendanceRecord,
} from "@/services/attendanceService";
import { apiClient } from "@/services/apiClient";
import dayjs from "dayjs";
import Head from "next/head";

// ---------------------------------------------------------
// 💎 STYLED COMPONENTS (RESPONSIVE & TOUCH-SCROLLABLE)
// ---------------------------------------------------------

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: "Prompt", sans-serif;
  width: 100%;
`;

const WelcomeBanner = styled.div`
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  border: 1px solid rgba(250, 204, 21, 0.5);
  border-radius: 20px;
  padding: 24px;
  color: #ffffff;
  box-shadow: 0 12px 28px rgba(29, 78, 216, 0.22);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 18px 16px;
  }
`;

const GreetingTitle = styled.h2`
  color: #ffffff;
  font-size: clamp(1.2rem, 4vw, 1.6rem);
  font-weight: 700;
  margin: 0;

  span {
    color: #facc15;
  }
`;

const BannerMetaText = styled.p`
  color: #94a3b8;
  font-size: clamp(0.78rem, 2.5vw, 0.88rem);
  margin: 4px 0 0 0;
`;

// 🧱 การ์ดสรุปสถิติ (ปรับขนาดอัตโนมัติตามหน้าจอ ป้องกันข้อความถูกตัด)
const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.03);

  @media (max-width: 576px) {
    padding: 12px 10px;
    gap: 8px;
    border-radius: 14px;
  }
`;

const StatIconBox = styled.div<{ $color?: string; $bg?: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${(props) => props.$bg || "rgba(29, 78, 216, 0.1)"};
  color: ${(props) => props.$color || "#1d4ed8"};
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  flex-shrink: 0;

  @media (max-width: 576px) {
    width: 36px;
    height: 36px;
    font-size: 17px;
    border-radius: 10px;
  }
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

const StatValue = styled.span`
  font-size: clamp(1.1rem, 3.5vw, 1.4rem);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
`;

const StatLabel = styled.span`
  font-size: clamp(0.68rem, 2.2vw, 0.8rem);
  color: #64748b;
  margin-top: 2px;
  font-weight: 600;
  line-height: 1.2;
  word-break: break-word;
`;

const ContentPanel = styled.div`
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(25px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  padding: 20px 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
  width: 100%;
  overflow: hidden;

  @media (max-width: 576px) {
    padding: 14px 10px;
    border-radius: 16px;
  }
`;

// 📱 แถบ Tabs ที่เปิดสิทธิ์ให้ใช้นิ้วปัดเลื่อนซ้าย-ขวาบนมือถือได้
const ScrollableTabs = styled(Tabs)`
  width: 100%;

  .ant-tabs-nav {
    margin-bottom: 16px !important;
    max-width: 100%;

    .ant-tabs-nav-wrap {
      overflow-x: auto !important;
      scrollbar-width: none; /* Firefox */
      &::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }
    }

    .ant-tabs-nav-list {
      display: flex;
      flex-wrap: nowrap !important;
    }

    .ant-tabs-tab {
      padding: 10px 16px !important;
      white-space: nowrap !important;
      font-weight: 700 !important;

      @media (max-width: 576px) {
        padding: 8px 12px !important;
        font-size: 0.85rem !important;
      }
    }
  }
`;

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    button {
      flex: 1;
    }
  }
`;

const StyledTable = styled(Table)`
  .ant-table {
    background: transparent !important;
  }
  .ant-table-thead > tr > th {
    background: rgba(29, 78, 216, 0.05) !important;
    color: #0f172a !important;
    font-weight: 700 !important;
    padding: 12px 14px !important;
  }
  .ant-table-tbody > tr > td {
    padding: 12px 14px !important;
  }
`;

const StudentGlassCard = styled.div<{ $isPending?: boolean }>`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 18px;
  border: 1px solid rgba(250, 204, 21, 0.45);
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 14px 28px rgba(29, 78, 216, 0.18);
    border-color: #facc15;
  }
`;

const PendingBadge = styled.div<{ $count: number }>`
  position: absolute;
  top: -10px;
  right: -8px;
  background: ${(props) =>
    props.$count > 0
      ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
      : "linear-gradient(135deg, #10b981 0%, #047857 100%)"};
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.78rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.4);
`;

const StudentAvatarBox = styled.div`
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  color: #facc15;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 12px;
  border: 1px solid rgba(250, 204, 21, 0.5);
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.22);
`;

const ProfileHeaderBox = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 576px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const safeExtractArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [skillsList, setSkillsList] = useState<any[]>([]);

  // State โปรไฟล์นักเรียนรายบุคคล
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentTasks, setStudentTasks] = useState<any[]>([]);
  const [studentSkills, setStudentSkills] = useState<any[]>([]);
  const [studentReports, setStudentReports] = useState<any[]>([]);
  const [studentPromotions, setStudentPromotions] = useState<any[]>([]);

  const [bonusPoints, setBonusPoints] = useState<number>(5);
  const [selectedBonusSkill, setSelectedBonusSkill] = useState<any>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // State เช็คชื่อ
  const [attendanceDate, setAttendanceDate] = useState<dayjs.Dayjs>(dayjs());
  const [selectedClassroom, setSelectedClassroom] = useState<string>("all");
  const [attendanceMap, setAttendanceMap] = useState<{
    [key: number]: "present" | "late" | "absent" | "leave";
  }>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Modals
  const [createTaskModal, setCreateTaskModal] = useState(false);
  const [createSkillModal, setCreateSkillModal] = useState(false);

  const [taskForm] = Form.useForm();
  const [promotionForm] = Form.useForm();
  const [skillForm] = Form.useForm();

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, tasksRes, reportsRes, promoRes, skillsRes]: any =
        await Promise.all([
          teacherService.getStudents(),
          teacherService.getAllTasks(),
          teacherService.getReports(),
          apiClient.get("/promotions"),
          apiClient.get("/skills"),
        ]);

      const extractedStudents = safeExtractArray(studentsRes);
      if (extractedStudents.length > 0) {
        setStudents(extractedStudents);
      }

      setTasks(safeExtractArray(tasksRes));
      setReports(safeExtractArray(reportsRes));
      setPromotions(safeExtractArray(promoRes));
      setSkillsList(safeExtractArray(skillsRes));
    } catch (error: any) {
      console.error("Error fetching teacher dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const formattedDate = attendanceDate.format("YYYY-MM-DD");
      const res: any = await attendanceService.getAttendance({
        date: formattedDate,
      });

      const extracted = safeExtractArray(res);
      const existingMap: { [key: number]: any } = {};

      students.forEach((s) => {
        existingMap[s.id] = "absent";
      });

      extracted.forEach((item: any) => {
        existingMap[item.student_id] = item.status;
      });

      setAttendanceMap(existingMap);
    } catch (e) {
      console.error("Error loading attendance", e);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    loadData();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      loadExistingAttendance();
    }
  }, [attendanceDate, students]);

  const handleOpenStudentDetail = async (student: any) => {
    setSelectedStudent(student);

    const filteredTasks = tasks.filter(
      (t) => t.student_id === student.id || !t.student_id
    );
    setStudentTasks(filteredTasks);

    const filteredReports = reports.filter(
      (r) => r.user_id === student.id || r.student_id === student.id
    );
    setStudentReports(filteredReports);

    const filteredPromotions = promotions.filter(
      (p) => p.student_id === student.id
    );
    setStudentPromotions(filteredPromotions);

    try {
      const resSkills = await apiClient.get(`/student-skills/${student.id}`);
      setStudentSkills(safeExtractArray(resSkills));
    } catch {
      setStudentSkills([]);
    }

    setIsStudentModalOpen(true);
  };

  const handleAttendanceChange = (
    studentId: number,
    status: "present" | "late" | "absent" | "leave"
  ) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    const filteredStudents =
      selectedClassroom === "all"
        ? students
        : students.filter((s) => s.classroom === selectedClassroom);

    if (filteredStudents.length === 0) {
      message.error("ไม่พบรายชื่อนักเรียนในห้องที่เลือก");
      return;
    }

    setSavingAttendance(true);
    try {
      const formattedDate = attendanceDate.format("YYYY-MM-DD");
      const records: AttendanceRecord[] = filteredStudents.map((s) => ({
        student_id: s.id,
        status: attendanceMap[s.id] || "absent",
      }));

      await attendanceService.saveAttendance(formattedDate, records);
      message.success(
        `บันทึกการปรับสถานะเช็คชื่อวันที่ ${attendanceDate.format(
          "DD/MM/YYYY"
        )} เรียบร้อยแล้ว`
      );
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการปรับสถานะ");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleApprove = async (
    taskId: number,
    step: "step1_assign" | "step2_grade",
    status: "approved" | "rejected"
  ) => {
    if (!currentUser?.id) return;
    try {
      await teacherService.approveTask(taskId, {
        teacher_id: currentUser.id,
        step,
        status,
      });
      message.success("อนุมัติงานและคำนวณแต้มทักษะเรียบร้อย!");
      loadData();
      setIsStudentModalOpen(false);
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการอนุมัติ");
    }
  };

  const handleCreateTask = async (values: any) => {
    if (!currentUser?.id) return;
    try {
      await teacherService.createTask({
        created_by: currentUser.id,
        student_ids: values.student_ids,
        title: values.title,
        description: values.description,
        target_skill: values.target_skill,
        skill_id: values.skill_id || null,
        points: values.points || 10,
      } as any);
      message.success("สั่งงานแก่นักเรียนเรียบร้อยแล้ว!");
      setCreateTaskModal(false);
      taskForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || "ไม่สามารถสร้างงานได้");
    }
  };

  const handleCreateSkill = async (values: any) => {
    try {
      await apiClient.post("/skills", values);
      message.success(`สร้างทักษะ "${values.name}" สำเร็จ!`);
      setCreateSkillModal(false);
      skillForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || "ไม่สามารถสร้างทักษะได้");
    }
  };

  const handleGiveBonusPoints = async (taskId?: number) => {
    try {
      if (taskId) {
        await handleApprove(taskId, "step2_grade", "approved");
      } else {
        await apiClient.post(
          `/students/${selectedStudent.id}/bonus-points`,
          {
            points: bonusPoints,
            skill_id: selectedBonusSkill,
          }
        );
        message.success(
          `มอบคะแนนพิเศษ +${bonusPoints} EXP ให้ ${selectedStudent.first_name} เรียบร้อยแล้ว!`
        );
      }
      loadData();
      setIsStudentModalOpen(false);
    } catch (error: any) {
      message.error("เกิดข้อผิดพลาดในการมอบคะแนน");
    }
  };

  const handleSendPromotionFromModal = async (values: any) => {
    try {
      await apiClient.post("/teacher/promotions", {
        student_id: selectedStudent.id,
        target_rank: values.target_rank,
        reason: values.reason,
      });
      message.success(
        `เสนอเรื่องเลื่อนขั้นให้ ${selectedStudent.first_name} ถึงแอดมินแล้ว!`
      );
      promotionForm.resetFields();
      loadData();
      setIsStudentModalOpen(false);
    } catch (error: any) {
      message.error(error.message || "เกิดข้อผิดพลาดในการเสนอเลื่อนขั้น");
    }
  };

  const pendingStep1Count = tasks.filter((t) => t.status === "pending").length;
  const pendingStep2Count = tasks.filter((t) => t.status === "submitted").length;

  const classroomsList = Array.from(
    new Set(students.map((s) => s.classroom).filter(Boolean))
  );

  const displayStudents =
    selectedClassroom === "all"
      ? students
      : students.filter((s) => s.classroom === selectedClassroom);

  const attendanceColumns = [
    {
      title: "รหัส",
      dataIndex: "student_code",
      key: "student_code",
      render: (code: string, record: any) => code || record.username,
    },
    {
      title: "ชื่อ-นามสกุล",
      dataIndex: "first_name",
      key: "first_name",
      render: (_: any, record: any) => (
        <span style={{ fontWeight: 600, color: "#0f172a" }}>
          {record.first_name} {record.last_name}
        </span>
      ),
    },
    {
      title: "ห้องเรียน",
      dataIndex: "classroom",
      key: "classroom",
      render: (cls: string) => <Tag color="blue">{cls || "ทั่วไป"}</Tag>,
    },
    {
      title: "การอัปโหลดเช็คชื่อ",
      key: "journal_check",
      render: (_: any, record: any) => {
        const isPresent = attendanceMap[record.id] === "present";
        return isPresent ? (
          <Tag
            color="green"
            icon={<CameraOutlined />}
            style={{ borderRadius: 8, padding: "4px 10px", fontWeight: 700 }}
          >
            อัปรูป/วิดีโอ เช็คชื่อแล้ว ✨
          </Tag>
        ) : (
          <Tag
            color="default"
            icon={<CloseCircleOutlined />}
            style={{ borderRadius: 8, padding: "4px 10px", color: "#64748b" }}
          >
            ยังไม่อัปโหลด
          </Tag>
        );
      },
    },
    {
      title: "ปรับแก้ไขสถานะ (กรณีฉุกเฉิน/ลา)",
      key: "attendance_status",
      render: (_: any, record: any) => (
        <Radio.Group
          value={attendanceMap[record.id] || "absent"}
          onChange={(e) => handleAttendanceChange(record.id, e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button
            value="present"
            style={{
              color: attendanceMap[record.id] === "present" ? "#fff" : "#059669",
            }}
          >
            มา
          </Radio.Button>
          <Radio.Button value="late">สาย</Radio.Button>
          <Radio.Button value="leave">ลา</Radio.Button>
          <Radio.Button value="absent">ขาด</Radio.Button>
        </Radio.Group>
      ),
    },
  ];

  const taskColumns = [
    {
      title: "ชื่องาน / โครงงาน",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: any) => (
        <div>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{text}</span>
          {record.description && (
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "นักเรียน",
      dataIndex: "student_id",
      key: "student_id",
      render: (id: number) => {
        const student = students.find((s) => s.id === id);
        return student ? (
          <Tag color="blue">
            {student.first_name} {student.last_name}
          </Tag>
        ) : (
          <Tag color="blue">ทุกคน / ID: {id || "ทั้งห้อง"}</Tag>
        );
      },
    },
    {
      title: "ทักษะเป้าหมาย",
      dataIndex: "target_skill",
      key: "target_skill",
      render: (skill: string) => <Tag color="gold">{skill || "ทักษะวิชาชีพ"}</Tag>,
    },
    {
      title: "คะแนน",
      dataIndex: "points",
      key: "points",
      render: (pts: number) => (
        <span style={{ color: "#059669", fontWeight: 700 }}>+{pts || 10} EXP</span>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        if (status === "completed") return <Tag color="success">เสร็จสมบูรณ์</Tag>;
        if (status === "submitted") return <Tag color="processing">รอตรวจ Step 2</Tag>;
        if (status === "in_progress") return <Tag color="cyan">กำลังทำ</Tag>;
        if (status === "rejected") return <Tag color="error">ปฏิเสธ</Tag>;
        return <Tag color="warning">รออนุมัติ Step 1</Tag>;
      },
    },
    {
      title: "การอนุมัติ",
      key: "action",
      render: (_: any, record: any) => {
        if (record.status === "pending") {
          return (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              style={{ background: "#1d4ed8", border: "1px solid #facc15", borderRadius: 8 }}
              onClick={() => handleApprove(record.id, "step1_assign", "approved")}
            >
              Step 1
            </Button>
          );
        }
        if (record.status === "submitted") {
          return (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ background: "#059669", border: "none", borderRadius: 8 }}
              onClick={() => handleApprove(record.id, "step2_grade", "approved")}
            >
              Step 2
            </Button>
          );
        }
        return <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>;
      },
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
            {record.first_name || record.student_first_name} {record.last_name || record.student_last_name}
          </span>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            รหัส: {record.student_code} ({record.classroom})
          </div>
        </div>
      ),
    },
    {
      title: "Rank",
      key: "rank_change",
      render: (_: any, record: any) => (
        <span>
          <Tag color="blue">Lv.{record.rank_level || record.current_rank || 1}</Tag> ➔{" "}
          <Tag color="gold">Lv.{record.target_rank || record.proposed_rank || 2}</Tag>
        </span>
      ),
    },
    {
      title: "เหตุผล",
      dataIndex: "reason",
      key: "reason",
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        if (status === "approved") return <Tag color="success">อนุมัติแล้ว</Tag>;
        if (status === "rejected") return <Tag color="error">ปฏิเสธ</Tag>;
        return <Tag color="warning">รอแอดมิน</Tag>;
      },
    },
  ];

  return (
    <>
      <Head>
        <title>Mechatronics and Robotics - Teacher Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/logo/MechaLogo.png" rel="icon" />
      </Head>
      <MainLayout
        userName={
          currentUser
            ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`
            : "อาจารย์"
        }
        rankLevel={99}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="large" />
            <p style={{ marginTop: 12 }}>กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <DashboardContainer>
            {/* Banner หลัก */}
            <WelcomeBanner>
              <div>
                <GreetingTitle>
                  สวัสดีอาจารย์, <span>{currentUser?.first_name || "ผู้สอน"}</span> 👨‍🏫
                </GreetingTitle>
                <BannerMetaText>
                  ระบบอนุมัติและประเมินผลการเรียนรู้เชิงบูรณาการกับการทำงาน (WIL Management)
                </BannerMetaText>
              </div>
              <ActionButtonGroup>
                <Button
                  type="default"
                  size="large"
                  icon={<SettingOutlined style={{ color: "#ffffff" }} />}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.3)",
                    fontWeight: 600,
                    borderRadius: 12,
                  }}
                  onClick={() => setCreateSkillModal(true)}
                >
                  + เพิ่มทักษะ
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  style={{
                    background: "#facc15",
                    color: "#172554",
                    border: "none",
                    fontWeight: 700,
                    borderRadius: 12,
                  }}
                  onClick={() => setCreateTaskModal(true)}
                >
                  สั่งงานใหม่
                </Button>
              </ActionButtonGroup>
            </WelcomeBanner>

            {/* Stat Cards (ปรับแต่งให้อ่านง่าย ข้อความไม่ขาด) */}
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={12} md={6}>
                <StatCard>
                  <StatIconBox $bg="rgba(250, 204, 21, 0.18)" $color="#eab308">
                    <ClockCircleOutlined />
                  </StatIconBox>
                  <StatInfo>
                    <StatValue>{pendingStep1Count}</StatValue>
                    <StatLabel>รออนุมัติ Step 1</StatLabel>
                  </StatInfo>
                </StatCard>
              </Col>

              <Col xs={12} sm={12} md={6}>
                <StatCard>
                  <StatIconBox $bg="rgba(16, 185, 129, 0.15)" $color="#059669">
                    <CheckCircleOutlined />
                  </StatIconBox>
                  <StatInfo>
                    <StatValue>{pendingStep2Count}</StatValue>
                    <StatLabel>รอตรวจให้คะแนน</StatLabel>
                  </StatInfo>
                </StatCard>
              </Col>

              <Col xs={12} sm={12} md={6}>
                <StatCard>
                  <StatIconBox $bg="rgba(37, 99, 235, 0.12)" $color="#2563eb">
                    <FileTextOutlined />
                  </StatIconBox>
                  <StatInfo>
                    <StatValue>{reports.length}</StatValue>
                    <StatLabel>รายงาน Journal</StatLabel>
                  </StatInfo>
                </StatCard>
              </Col>

              <Col xs={12} sm={12} md={6}>
                <StatCard>
                  <StatIconBox $bg="rgba(168, 85, 247, 0.15)" $color="#9333ea">
                    <SolutionOutlined />
                  </StatIconBox>
                  <StatInfo>
                    <StatValue>{students.length}</StatValue>
                    <StatLabel>นักเรียนในระบบ</StatLabel>
                  </StatInfo>
                </StatCard>
              </Col>
            </Row>

            {/* Content Panel (ใช้ ScrollableTabs เลื่อนซ้าย-ขวาบนมือถือได้ลื่นไหล) */}
            <ContentPanel>
              <ScrollableTabs
                defaultActiveKey="1"
                items={[
                  // TAB 1: การ์ดนักเรียนรายบุคคล
                  {
                    key: "1",
                    label: (
                      <span>
                        <UserOutlined /> รายชื่อนักเรียน ({displayStudents.length})
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        {displayStudents.length === 0 ? (
                          <Empty description="ไม่พบรายชื่อนักเรียนในระบบ" />
                        ) : (
                          <Row gutter={[16, 16]}>
                            {displayStudents.map((student) => {
                              const pendingCount = tasks.filter(
                                (t) =>
                                  (t.student_id === student.id || !t.student_id) &&
                                  t.status !== "completed"
                              ).length;

                              return (
                                <Col xs={24} sm={12} md={8} lg={6} key={student.id}>
                                  <StudentGlassCard
                                    onClick={() => handleOpenStudentDetail(student)}
                                    $isPending={pendingCount > 0}
                                  >
                                    <PendingBadge $count={pendingCount}>
                                      {pendingCount > 0
                                        ? `งานค้าง ${pendingCount}`
                                        : "ครบถ้วน ✨"}
                                    </PendingBadge>

                                    <StudentAvatarBox>
                                      <UserOutlined />
                                    </StudentAvatarBox>

                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "1.05rem",
                                        color: "#0f172a",
                                      }}
                                    >
                                      {student.first_name} {student.last_name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "0.82rem",
                                        color: "#64748b",
                                        marginTop: 2,
                                        marginBottom: 12,
                                      }}
                                    >
                                      รหัส: {student.student_code || student.username} | ห้อง: {student.classroom || "ทั่วไป"}
                                    </div>

                                    <Space wrap size={8}>
                                      <Tag
                                        color="gold"
                                        icon={<CrownOutlined />}
                                        style={{ borderRadius: 8, fontWeight: 700 }}
                                      >
                                        Rank Lv.{student.rank_level || 1}
                                      </Tag>
                                      <Tag
                                        color="blue"
                                        style={{ borderRadius: 8, fontWeight: 700 }}
                                      >
                                        {student.total_exp || 0} EXP
                                      </Tag>
                                    </Space>
                                  </StudentGlassCard>
                                </Col>
                              );
                            })}
                          </Row>
                        )}
                      </div>
                    ),
                  },
                  // TAB 2: ตรวจงานรวม
                  {
                    key: "2",
                    label: (
                      <span>
                        <CheckCircleOutlined /> ตรวจงานค้าง ({pendingStep1Count + pendingStep2Count})
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <StyledTable
                          dataSource={tasks}
                          columns={taskColumns}
                          rowKey="id"
                          pagination={{ pageSize: 8 }}
                          scroll={{ x: 600 }}
                        />
                      </div>
                    ),
                  },
                  // TAB 3: รายงาน Journal
                  {
                    key: "3",
                    label: (
                      <span>
                        <ReadOutlined /> รายงาน Journal
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <Row gutter={[16, 16]}>
                          {reports.length === 0 ? (
                            <Col span={24}>
                              <Empty description="ยังไม่มีการส่งรายงานประจำวัน" />
                            </Col>
                          ) : (
                            reports.map((item: any) => {
                              let files: string[] = [];
                              try {
                                files = item.image_url ? JSON.parse(item.image_url) : [];
                              } catch {
                                if (item.image_url) files = [item.image_url];
                              }

                              return (
                                <Col xs={24} sm={12} md={8} key={item.id}>
                                  <Card
                                    size="small"
                                    style={{
                                      borderRadius: 16,
                                      border: "1px solid rgba(250, 204, 21, 0.45)",
                                      background: "rgba(255,255,255,0.95)",
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, color: "#1d4ed8" }}>
                                      {item.first_name} {item.last_name} ({item.student_code})
                                    </div>
                                    <div style={{ fontSize: 11, color: "#64748b", margin: "2px 0 6px 0" }}>
                                      📅 วันที่ส่ง: {item.report_date}
                                    </div>
                                    <p style={{ fontSize: 12.5, color: "#334155", margin: "0 0 8px 0" }}>
                                      {item.details || "ไม่มีข้อความอธิบาย"}
                                    </p>

                                    {files.length > 0 && (
                                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {files.map((fileUrl, idx) => {
                                          const isVideo = fileUrl.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                                          const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}${fileUrl}`;
                                          
                                          return isVideo ? (
                                            <video 
                                              key={idx} 
                                              src={fullUrl} 
                                              controls 
                                              style={{ width: 120, height: 80, borderRadius: 8, objectFit: "cover" }} 
                                            />
                                          ) : (
                                            <Image
                                              key={idx}
                                              width={60}
                                              height={60}
                                              style={{ objectFit: "cover", borderRadius: 8 }}
                                              src={fullUrl}
                                              alt="รูปปฏิบัติงาน"
                                            />
                                          );
                                        })}
                                      </div>
                                    )}
                                  </Card>
                                </Col>
                              );
                            })
                          )}
                        </Row>
                      </div>
                    ),
                  },
                  // TAB 4: ตรวจสอบการเข้าเรียน
                  {
                    key: "4",
                    label: (
                      <span>
                        <CalendarOutlined /> ตรวจสอบการเข้าเรียน (Attendance)
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            marginBottom: 16,
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                              alignItems: "center",
                              width: "100%",
                              maxWidth: 450,
                            }}
                          >
                            <DatePicker
                              value={attendanceDate}
                              onChange={(d) => d && setAttendanceDate(d)}
                              format="DD/MM/YYYY"
                              size="middle"
                              style={{ flex: 1, height: 38 }}
                            />
                            <Select
                              value={selectedClassroom}
                              onChange={(val) => setSelectedClassroom(val)}
                              size="middle"
                              style={{ flex: 1, minWidth: 120, height: 38 }}
                            >
                              <Select.Option value="all">ทุกห้องเรียน</Select.Option>
                              {classroomsList.map((cls) => (
                                <Select.Option key={cls} value={cls}>
                                  {cls}
                                </Select.Option>
                              ))}
                            </Select>
                          </div>

                          <Button
                            type="primary"
                            size="middle"
                            icon={<SaveOutlined />}
                            loading={savingAttendance}
                            style={{
                              background: "#1d4ed8",
                              border: "1px solid #facc15",
                              borderRadius: 10,
                              height: 38,
                              fontWeight: 600,
                            }}
                            onClick={handleSaveAttendance}
                          >
                            บันทึกเช็คชื่อ
                          </Button>
                        </div>

                        <StyledTable
                          dataSource={displayStudents}
                          columns={attendanceColumns}
                          rowKey="id"
                          pagination={{ pageSize: 10 }}
                          scroll={{ x: 600 }}
                        />
                      </div>
                    ),
                  },
                  // TAB 5: เสนอเลื่อนขั้น
                  {
                    key: "5",
                    label: (
                      <span>
                        <TrophyOutlined /> เสนอเลื่อนขั้น ({promotions.length})
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <StyledTable
                          dataSource={promotions}
                          columns={promotionColumns}
                          rowKey="id"
                          pagination={{ pageSize: 6 }}
                          scroll={{ x: 550 }}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </ContentPanel>

            {/* 🎴 MODAL การ์ดประจำตัวนักเรียน (แบ่ง 2 คอลัมน์ สะอาดตา) */}
            <Modal
              title={null}
              open={isStudentModalOpen}
              onCancel={() => setIsStudentModalOpen(false)}
              footer={null}
              centered
              width={880}
              style={{ borderRadius: 24, overflow: "hidden" }}
            >
              {selectedStudent && (
                <div style={{ padding: "8px 4px" }}>
                  <ProfileHeaderBox>
                    <StudentAvatarBox
                      style={{ margin: 0, width: 64, height: 64, fontSize: 28 }}
                    >
                      <UserOutlined />
                    </StudentAvatarBox>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.45rem",
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </h3>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          color: "#64748b",
                          fontSize: "0.9rem",
                        }}
                      >
                        ห้องเรียน: {selectedStudent.classroom || "ทั่วไป"} |
                        รหัสนักศึกษา:{" "}
                        {selectedStudent.student_code || selectedStudent.username}
                      </p>
                      <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                        <Tag
                          color="gold"
                          icon={<CrownOutlined />}
                          style={{ borderRadius: 8, fontWeight: 700, padding: "2px 10px" }}
                        >
                          Rank Lv.{selectedStudent.rank_level || 1}
                        </Tag>
                        <Tag
                          color="purple"
                          style={{ borderRadius: 8, fontWeight: 700, padding: "2px 10px" }}
                        >
                          <StarFilled style={{ color: "#facc15" }} />{" "}
                          {selectedStudent.total_exp || 0} Total EXP
                        </Tag>
                      </div>
                    </div>
                  </ProfileHeaderBox>

                  <Row gutter={[20, 20]}>
                    <Col xs={24} md={9}>
                      {/* หลอดทักษะ */}
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 16,
                          padding: 16,
                          border: "1px solid #e2e8f0",
                          marginBottom: 16,
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 12px 0",
                            color: "#0f172a",
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <BuildOutlined style={{ color: "#2563eb" }} /> ระดับทักษะสะสม
                        </h4>
                        {studentSkills.length === 0 ? (
                          <p style={{ color: "#94a3b8", textAlign: "center", margin: 0, fontSize: 12, padding: "8px 0" }}>
                            ยังไม่มีคะแนนทักษะในระบบ
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {studentSkills.map((sk, idx) => {
                              const pts = sk.points || 0;
                              const percent = Math.min(pts, 100);
                              return (
                                <div key={sk.skill_id || idx}>
                                  <div style={{ marginBottom: 2, display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600 }}>
                                    <span>{sk.skill_name || "ทักษะวิชาชีพ"}</span>
                                    <span style={{ color: "#2563eb" }}>{pts} แต้ม</span>
                                  </div>
                                  <Progress percent={percent} showInfo={false} strokeColor="#2563eb" trailColor="#e2e8f0" strokeWidth={8} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* มอบคะแนนพิเศษ */}
                      <div
                        style={{
                          background: "#f0fdf4",
                          borderRadius: 16,
                          padding: 16,
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <h4 style={{ margin: "0 0 10px 0", color: "#166534", fontWeight: 800, fontSize: "0.92rem" }}>
                          ⚡ มอบคะแนนพิเศษ (EXP)
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <InputNumber
                            min={1}
                            max={100}
                            value={bonusPoints}
                            onChange={(val) => setBonusPoints(val || 1)}
                            style={{ width: "100%", borderRadius: 8, height: 38, display: "flex", alignItems: "center" }}
                          />
                          <Select
                            placeholder="เลือกทักษะที่ต้องการบวกแต้ม"
                            allowClear
                            style={{ width: "100%", height: 38 }}
                            onChange={(val) => setSelectedBonusSkill(val)}
                          >
                            {skillsList.map((sk) => (
                              <Select.Option key={sk.id} value={sk.id}>
                                {sk.name}
                              </Select.Option>
                            ))}
                          </Select>
                          <Button
                            type="primary"
                            icon={<SendOutlined />}
                            block
                            style={{ background: "#1d4ed8", border: "1px solid #facc15", borderRadius: 8, height: 38, fontWeight: 600 }}
                            onClick={() => handleGiveBonusPoints()}
                          >
                            มอบคะแนน
                          </Button>
                        </div>
                      </div>
                    </Col>

                    <Col xs={24} md={15}>
                      <ScrollableTabs
                        defaultActiveKey="tasks"
                        size="middle"
                        items={[
                          // ตรวจงานรายบุคคล
                          {
                            key: "tasks",
                            label: (
                              <span>
                                <CheckCircleOutlined /> ตรวจงาน ({studentTasks.length})
                              </span>
                            ),
                            children: (
                              <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                                {studentTasks.length === 0 ? (
                                  <Empty description="ยังไม่มีภารกิจค้างส่ง" style={{ padding: "16px 0" }} />
                                ) : (
                                  studentTasks.map((task) => (
                                    <div
                                      key={task.id}
                                      style={{
                                        background: "#ffffff",
                                        borderRadius: 12,
                                        padding: 12,
                                        marginBottom: 8,
                                        border: "1px solid #e2e8f0",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 10,
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                                          {task.title}
                                        </div>
                                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
                                          {task.description || "ไม่มีคำอธิบาย"}
                                        </div>
                                      </div>

                                      <div>
                                        {task.status === "completed" ? (
                                          <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: 6 }}>
                                            ตรวจแล้ว
                                          </Tag>
                                        ) : task.status === "pending" ? (
                                          <Button
                                            size="small"
                                            type="primary"
                                            style={{ background: "#1d4ed8", border: "1px solid #facc15", borderRadius: 6 }}
                                            onClick={() => handleApprove(task.id, "step1_assign", "approved")}
                                          >
                                            Step 1
                                          </Button>
                                        ) : (
                                          <Button
                                            size="small"
                                            type="primary"
                                            style={{ background: "#059669", border: "none", borderRadius: 6 }}
                                            onClick={() => handleApprove(task.id, "step2_grade", "approved")}
                                          >
                                            Step 2
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            ),
                          },
                          // Journal ประจำวัน
                          {
                            key: "journals",
                            label: (
                              <span>
                                <ReadOutlined /> Journal ({studentReports.length})
                              </span>
                            ),
                            children: (
                              <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                                {studentReports.length === 0 ? (
                                  <Empty description="ยังไม่มีรายงานประจำวัน" style={{ padding: "16px 0" }} />
                                ) : (
                                  studentReports.map((item) => {
                                    let files: string[] = [];
                                    try {
                                      files = item.image_url ? JSON.parse(item.image_url) : [];
                                    } catch {
                                      if (item.image_url) files = [item.image_url];
                                    }

                                    return (
                                      <Card key={item.id} size="small" style={{ marginBottom: 8, borderRadius: 12 }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#2563eb", marginBottom: 4 }}>
                                          📅 วันที่ส่ง: {item.report_date}
                                        </div>
                                        <p style={{ fontSize: 12.5, color: "#334155", margin: "0 0 6px 0" }}>
                                          {item.details || "ไม่มีข้อความอธิบาย"}
                                        </p>
                                        {files.length > 0 && (
                                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            {files.map((fileUrl, idx) => {
                                              const isVideo = fileUrl.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                                              const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}${fileUrl}`;
                                              return isVideo ? (
                                                <video key={idx} src={fullUrl} controls style={{ width: 120, height: 75, borderRadius: 8, objectFit: "cover" }} />
                                              ) : (
                                                <Image key={idx} width={60} height={60} style={{ objectFit: "cover", borderRadius: 8 }} src={fullUrl} alt="รูป" />
                                              );
                                            })}
                                          </div>
                                        )}
                                      </Card>
                                    );
                                  })
                                )}
                              </div>
                            ),
                          },
                          // เสนอเลื่อนขั้น
                          {
                            key: "promotion",
                            label: (
                              <span>
                                <TrophyOutlined /> เสนอเลื่อนขั้น
                              </span>
                            ),
                            children: (
                              <div>
                                <Form form={promotionForm} layout="vertical" onFinish={handleSendPromotionFromModal}>
                                  <Form.Item label="Rank Level ที่เสนอขึ้นไป" name="target_rank" rules={[{ required: true }]}>
                                    <InputNumber min={2} max={10} style={{ width: "100%", borderRadius: 8, height: 38, display: "flex", alignItems: "center" }} placeholder="เช่น Rank 2" />
                                  </Form.Item>
                                  <Form.Item label="เหตุผล / ผลงานโดดเด่น" name="reason">
                                    <Input.TextArea rows={2} placeholder="อธิบายผลงาน..." style={{ borderRadius: 8 }} />
                                  </Form.Item>
                                  <Button type="primary" htmlType="submit" icon={<SendOutlined />} block style={{ background: "#1d4ed8", border: "1px solid #facc15", borderRadius: 10, height: 38 }}>
                                    ส่งเสนอแอดมิน
                                  </Button>
                                </Form>
                              </div>
                            ),
                          },
                        ]}
                      />
                    </Col>
                  </Row>
                </div>
              )}
            </Modal>

            {/* Modal สั่งงานใหม่ */}
            <Modal
              title="มอบหมายภารกิจใหม่ให้นักเรียน"
              open={createTaskModal}
              onCancel={() => setCreateTaskModal(false)}
              footer={null}
              centered
              width={540}
            >
              <Form form={taskForm} layout="vertical" onFinish={handleCreateTask} style={{ marginTop: 12 }}>
                <Form.Item label="เลือกนักเรียนเป้าหมาย" name="student_ids" rules={[{ required: true, message: "กรุณาเลือกนักเรียนอย่างน้อย 1 คน" }]}>
                  <Select mode="multiple" placeholder="เลือกนักเรียน..." optionFilterProp="label" size="middle" options={students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name} (${s.student_code || s.username})` }))} />
                </Form.Item>
                <Form.Item label="ชื่องาน / โครงงาน" name="title" rules={[{ required: true, message: "กรุณากรอกชื่องาน" }]}>
                  <Input placeholder="เช่น ประกอบชุดฝึกนิวแมติกส์ควบคุมด้วย PLC" size="middle" />
                </Form.Item>
                <Form.Item label="🎯 ทักษะที่จะได้รับ" name="skill_id">
                  <Select placeholder="-- เลือกทักษะที่เกี่ยวข้อง --" allowClear size="middle">
                    {skillsList.map((sk) => (
                      <Select.Option key={sk.id} value={sk.id}>{sk.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item label="คำอธิบายเพิ่มเติม" name="description">
                  <Input.TextArea rows={3} placeholder="รายละเอียดหรือเงื่อนไข..." />
                </Form.Item>
                <Form.Item label="คะแนน EXP" name="points" initialValue={10} rules={[{ required: true }]}>
                  <InputNumber min={5} max={100} style={{ width: "100%" }} size="middle" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block style={{ background: "#1d4ed8", border: "1px solid #facc15", borderRadius: 10, height: 42 }}>
                  ยืนยันสั่งงาน
                </Button>
              </Form>
            </Modal>

            {/* Modal เพิ่มทักษะใหม่ */}
            <Modal
              title="⚙️ เพิ่มหมวดหมู่ทักษะใหม่ลง Database"
              open={createSkillModal}
              onCancel={() => setCreateSkillModal(false)}
              footer={null}
              centered
              width={480}
            >
              <Form form={skillForm} layout="vertical" onFinish={handleCreateSkill} style={{ marginTop: 12 }}>
                <Form.Item name="name" label="ชื่อทักษะ (Skill Name)" rules={[{ required: true, message: "กรุณากรอกชื่อทักษะ" }]}>
                  <Input placeholder="เช่น การเขียนโปรแกรม PLC" size="middle" />
                </Form.Item>
                <Form.Item name="description" label="รายละเอียดทักษะ">
                  <Input.TextArea rows={3} placeholder="คำอธิบายขอบเขตทักษะ..." />
                </Form.Item>
                <Button type="primary" htmlType="submit" block style={{ background: "#1d4ed8", border: "1px solid #facc15", borderRadius: 10, height: 42 }}>
                  สร้างทักษะ
                </Button>
              </Form>
            </Modal>
          </DashboardContainer>
        )}
      </MainLayout>
    </>
  );
}
