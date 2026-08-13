import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineBolt,
  HiOutlineCircleStack,
  HiOutlineExclamationTriangle,
  HiOutlineLightBulb,
  HiOutlinePower,
  HiOutlineShieldCheck,
  HiOutlineStopCircle,
} from "react-icons/hi2";
import { LuGauge, LuGitBranch, LuRadioTower } from "react-icons/lu";
import { TbCircuitAmmeter, TbCircuitSwitchOpen, TbPlugConnected } from "react-icons/tb";
import { MdOutlineElectricMeter, MdOutlineSensors } from "react-icons/md";
import type {
  ComponentDefinition,
  Exercise,
  Lesson,
  LessonCategory,
  LessonLevel,
  LessonSection,
} from "@/types/motorControl";

const lessonSeed: Array<{
  title: string;
  category: LessonCategory;
  level: LessonLevel;
  description: string;
}> = [
  { title: "Motor Control คืออะไร", category: "Basics", level: "Beginner", description: "ทำความเข้าใจหน้าที่ โครงสร้าง และภาพรวมของระบบควบคุมมอเตอร์" },
  { title: "Electrical Fundamentals", category: "Basics", level: "Beginner", description: "ทบทวนแรงดัน กระแส กำลังไฟฟ้า และหลักพื้นฐานที่จำเป็น" },
  { title: "AC Motor", category: "Motors", level: "Beginner", description: "รู้จักชนิด ส่วนประกอบ และหลักการหมุนของมอเตอร์กระแสสลับ" },
  { title: "DC Motor", category: "Motors", level: "Beginner", description: "เรียนรู้โครงสร้างและการควบคุมความเร็วของมอเตอร์กระแสตรง" },
  { title: "Servo Motor", category: "Motors", level: "Intermediate", description: "การควบคุมตำแหน่ง ความเร็ว และแรงบิดแบบวงปิด" },
  { title: "Stepper Motor", category: "Motors", level: "Intermediate", description: "หลักการขับมอเตอร์แบบเป็นสเต็ปและการประยุกต์ใช้งาน" },
  { title: "Contactor", category: "Components", level: "Beginner", description: "อุปกรณ์ตัดต่อวงจรกำลังที่เป็นหัวใจของ Motor Control" },
  { title: "Overload Relay", category: "Protection", level: "Beginner", description: "ปกป้องมอเตอร์จากกระแสเกินและการทำงานหนักต่อเนื่อง" },
  { title: "Circuit Breaker", category: "Protection", level: "Beginner", description: "เลือกและใช้อุปกรณ์ตัดวงจรเพื่อความปลอดภัย" },
  { title: "Fuse", category: "Protection", level: "Beginner", description: "หลักการป้องกันกระแสลัดวงจรด้วยฟิวส์ชนิดต่าง ๆ" },
  { title: "Push Button", category: "Components", level: "Beginner", description: "หน้าสัมผัส NO/NC และการใช้ปุ่มกดในวงจรควบคุม" },
  { title: "Selector Switch", category: "Components", level: "Beginner", description: "เลือกโหมด Manual, Auto และทิศทางการทำงาน" },
  { title: "Relay", category: "Components", level: "Beginner", description: "แยกและขยายสัญญาณควบคุมด้วยรีเลย์แม่เหล็กไฟฟ้า" },
  { title: "Limit Switch", category: "Components", level: "Intermediate", description: "ตรวจจับตำแหน่งกลไกและสร้าง interlock ในเครื่องจักร" },
  { title: "Sensor", category: "Components", level: "Intermediate", description: "เลือกใช้ proximity และ photoelectric sensor ในระบบควบคุม" },
  { title: "Direct On Line - DOL", category: "Motor Circuits", level: "Beginner", description: "วงจรสตาร์ตมอเตอร์แบบตรง พร้อมวงจรค้างและป้องกัน" },
  { title: "Forward / Reverse", category: "Motor Circuits", level: "Intermediate", description: "กลับทิศทางหมุนอย่างปลอดภัยด้วย interlock" },
  { title: "Star Delta", category: "Motor Circuits", level: "Advanced", description: "ลดกระแสเริ่มต้นด้วยการเปลี่ยนการต่อสตาร์เป็นเดลตา" },
  { title: "Soft Starter", category: "Motor Drives", level: "Intermediate", description: "ลดแรงกระชากและควบคุมการเร่งมอเตอร์อย่างนุ่มนวล" },
  { title: "Variable Frequency Drive - VFD", category: "Motor Drives", level: "Advanced", description: "ควบคุมความถี่ แรงดัน และความเร็วของมอเตอร์ AC" },
  { title: "Motor Speed Control", category: "Motor Drives", level: "Intermediate", description: "เปรียบเทียบวิธีควบคุมความเร็วของมอเตอร์แต่ละชนิด" },
  { title: "Motor Protection", category: "Protection", level: "Intermediate", description: "ออกแบบการป้องกัน overload, short circuit และ phase loss" },
  { title: "Control Circuit", category: "Motor Circuits", level: "Intermediate", description: "อ่านและออกแบบวงจรสั่งงาน ค้างวงจร และ interlock" },
  { title: "Power Circuit", category: "Motor Circuits", level: "Intermediate", description: "เส้นทางพลังงานตั้งแต่แหล่งจ่ายไปถึงมอเตอร์" },
  { title: "Electrical Symbols", category: "Basics", level: "Beginner", description: "รู้จักสัญลักษณ์มาตรฐานที่ใช้ในแบบไฟฟ้าอุตสาหกรรม" },
  { title: "Wiring Diagram", category: "Basics", level: "Intermediate", description: "อ่านหมายเลขสาย terminal และแบบการต่อวงจรจริง" },
  { title: "Motor Troubleshooting", category: "Troubleshooting", level: "Advanced", description: "วิเคราะห์อาการเสียอย่างเป็นระบบด้วยเครื่องมือวัด" },
  { title: "Motor Control Safety", category: "Protection", level: "Beginner", description: "ปฏิบัติงานอย่างปลอดภัยด้วย LOTO, PPE และการตรวจสอบก่อนจ่ายไฟ" },
];

const createContent = (title: string): LessonSection[] => [
  {
    title: "Overview",
    paragraphs: [`บทเรียนนี้อธิบาย ${title} ตั้งแต่แนวคิดพื้นฐานไปจนถึงการนำไปใช้ในงาน Motor Control เพื่อให้คุณเชื่อมโยงสัญลักษณ์ อุปกรณ์ และลำดับการทำงานได้อย่างเป็นระบบ`],
  },
  {
    title: "Theory",
    paragraphs: ["ระบบควบคุมมอเตอร์แบ่งเป็นวงจรกำลังและวงจรควบคุม วงจรกำลังส่งพลังงานไปยังโหลด ส่วนวงจรควบคุมกำหนดว่ามอเตอร์จะเริ่ม หยุด หรือเปลี่ยนสถานะเมื่อใด"],
    bullets: ["แยกวงจรกำลังออกจากวงจรควบคุมให้ชัดเจน", "ใช้หน้าสัมผัส NO/NC ให้ตรงกับเงื่อนไข", "เลือกพิกัดอุปกรณ์ให้เหมาะกับมอเตอร์"],
  },
  {
    title: "How It Works",
    paragraphs: ["เมื่อได้รับคำสั่ง อุปกรณ์ควบคุมจะเปลี่ยนสถานะของหน้าสัมผัส ทำให้คอยล์หรือไดรฟ์ทำงาน จากนั้นวงจรป้องกันจะคอยตัดระบบเมื่อพบสภาวะผิดปกติ"],
  },
  {
    title: "Components",
    paragraphs: ["อุปกรณ์หลักที่พบร่วมกัน ได้แก่ แหล่งจ่าย เซอร์กิตเบรกเกอร์ คอนแทคเตอร์ โอเวอร์โหลด อุปกรณ์สั่งงาน และมอเตอร์"],
  },
  {
    title: "Circuit Diagram",
    paragraphs: ["พื้นที่ Diagram เตรียมไว้สำหรับแสดง Schematic, Wiring Diagram และภาพตำแหน่ง Terminal ในเนื้อหาเวอร์ชันถัดไป"],
  },
  {
    title: "Working Sequence",
    paragraphs: ["ตรวจสอบความพร้อม → รับคำสั่ง → ประมวลผลเงื่อนไขและ interlock → จ่ายกำลังให้มอเตอร์ → ตรวจติดตามสถานะและการป้องกัน"],
  },
  {
    title: "Example",
    paragraphs: ["ในวงจร Start/Stop เมื่อกด START คอยล์คอนแทคเตอร์จะทำงานและหน้าสัมผัสช่วยจะค้างวงจรไว้ เมื่อกด STOP วงจรคอยล์ถูกตัดและมอเตอร์หยุด"],
  },
  {
    title: "Common Problems",
    paragraphs: ["ปัญหาที่พบบ่อยคือแรงดันควบคุมไม่ถูกต้อง หน้าสัมผัสหลวม ลำดับสายผิด และอุปกรณ์ป้องกันตั้งค่าไม่เหมาะสม"],
  },
  {
    title: "Safety",
    paragraphs: ["ตัดแยกแหล่งจ่ายและทำ Lockout/Tagout ก่อนแก้ไขวงจรทุกครั้ง ตรวจยืนยันว่าไม่มีแรงดัน และใช้อุปกรณ์ป้องกันส่วนบุคคลที่เหมาะสม"],
  },
  {
    title: "Quiz",
    paragraphs: ["วงจรใดทำหน้าที่ส่งพลังงานไปยังมอเตอร์ และอุปกรณ์ใดเป็นตัวป้องกันมอเตอร์เมื่อเกิดกระแสเกิน?"],
  },
];

export const lessons: Lesson[] = lessonSeed.map((item, index) => {
  const id = `${index + 1}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "motor-control"}`;
  return {
    ...item,
    id,
    index: index + 1,
    duration: `${12 + (index % 4) * 3} min`,
    content: createContent(item.title),
    previousLesson: index > 0 ? `${index}-${lessonSeed[index - 1].title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "motor-control"}` : undefined,
    nextLesson: index < lessonSeed.length - 1 ? `${index + 2}-${lessonSeed[index + 1].title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "motor-control"}` : undefined,
  };
});

export const lessonCategories: Array<"All Lessons" | LessonCategory> = [
  "All Lessons", "Basics", "Motors", "Components", "Motor Circuits", "Motor Drives", "Protection", "Troubleshooting",
];

export const electricalComponents: ComponentDefinition[] = [
  { id: "ac-power", type: "acPower", name: "AC Power Supply", shortName: "AC", category: "Supply", terminals: [{ id: "r", label: "R", kind: "power", position: "bottom" }, { id: "s", label: "S", kind: "power", position: "bottom" }, { id: "t", label: "T", kind: "power", position: "bottom" }, { id: "n", label: "N", kind: "power", position: "bottom" }], properties: { voltage: "400 VAC", phases: 3 }, defaultState: "READY", interactiveStates: ["READY", "OFF"], accent: "#38bdf8", icon: HiOutlineBolt },
  { id: "dc-power", type: "dcPower", name: "DC Power Supply", shortName: "DC", category: "Supply", terminals: [{ id: "pos", label: "+", kind: "control", position: "bottom" }, { id: "neg", label: "−", kind: "control", position: "bottom" }], properties: { voltage: "24 VDC" }, defaultState: "READY", interactiveStates: ["READY", "OFF"], accent: "#38bdf8", icon: HiOutlinePower },
  { id: "breaker", type: "breaker", name: "Circuit Breaker", shortName: "QF", category: "Protection", terminals: [{ id: "in1", label: "1", kind: "power", position: "top" }, { id: "in2", label: "3", kind: "power", position: "top" }, { id: "in3", label: "5", kind: "power", position: "top" }, { id: "out1", label: "2", kind: "power", position: "bottom" }, { id: "out2", label: "4", kind: "power", position: "bottom" }, { id: "out3", label: "6", kind: "power", position: "bottom" }], properties: { rating: "16 A", poles: 3 }, defaultState: "OFF", interactiveStates: ["OFF", "ON"], accent: "#f59e0b", icon: TbCircuitSwitchOpen },
  { id: "fuse", type: "fuse", name: "Fuse", shortName: "FU", category: "Protection", terminals: [{ id: "in", label: "1", kind: "power", position: "top" }, { id: "out", label: "2", kind: "power", position: "bottom" }], properties: { rating: "10 A" }, defaultState: "NORMAL", interactiveStates: ["NORMAL", "BLOWN"], accent: "#f59e0b", icon: HiOutlineShieldCheck },
  { id: "contactor", type: "contactor", name: "Contactor", shortName: "KM", category: "Control", terminals: [{ id: "l1", label: "L1", kind: "power", position: "top" }, { id: "l2", label: "L2", kind: "power", position: "top" }, { id: "l3", label: "L3", kind: "power", position: "top" }, { id: "t1", label: "T1", kind: "power", position: "bottom" }, { id: "t2", label: "T2", kind: "power", position: "bottom" }, { id: "t3", label: "T3", kind: "power", position: "bottom" }, { id: "a1", label: "A1", kind: "control", position: "left" }, { id: "a2", label: "A2", kind: "control", position: "right" }], properties: { coil: "24 VDC", current: "12 A", poles: 3 }, defaultState: "OFF", interactiveStates: ["OFF", "ENERGIZED"], accent: "#a78bfa", icon: TbCircuitAmmeter },
  { id: "overload", type: "overload", name: "Overload Relay", shortName: "OL", category: "Protection", terminals: [{ id: "l1", label: "L1", kind: "power", position: "top" }, { id: "l2", label: "L2", kind: "power", position: "top" }, { id: "l3", label: "L3", kind: "power", position: "top" }, { id: "t1", label: "T1", kind: "power", position: "bottom" }, { id: "t2", label: "T2", kind: "power", position: "bottom" }, { id: "t3", label: "T3", kind: "power", position: "bottom" }, { id: "95", label: "95", kind: "control", position: "left" }, { id: "96", label: "96", kind: "control", position: "right" }], properties: { range: "4–6 A", poles: 3 }, defaultState: "NORMAL", interactiveStates: ["NORMAL", "TRIPPED"], accent: "#f97316", icon: HiOutlineExclamationTriangle },
  { id: "relay", type: "relay", name: "Relay", shortName: "KA", category: "Control", terminals: [{ id: "a1", label: "A1", kind: "control", position: "left" }, { id: "a2", label: "A2", kind: "control", position: "right" }, { id: "11", label: "11", kind: "control", position: "top" }, { id: "12", label: "12", kind: "control", position: "bottom" }, { id: "14", label: "14", kind: "control", position: "bottom" }], properties: { coil: "24 VDC", contact: "1CO" }, defaultState: "OFF", interactiveStates: ["OFF", "ENERGIZED"], accent: "#a78bfa", icon: LuGitBranch },
  { id: "start-button", type: "startButton", name: "Start Push Button", shortName: "START", category: "Control", terminals: [{ id: "13", label: "13", kind: "control", position: "top" }, { id: "14", label: "14", kind: "control", position: "bottom" }], properties: { contact: "NO" }, defaultState: "RELEASED", interactiveStates: ["RELEASED", "PRESSED"], accent: "#22c55e", icon: HiOutlinePower },
  { id: "stop-button", type: "stopButton", name: "Stop Push Button", shortName: "STOP", category: "Control", terminals: [{ id: "21", label: "21", kind: "control", position: "top" }, { id: "22", label: "22", kind: "control", position: "bottom" }], properties: { contact: "NC" }, defaultState: "RELEASED", interactiveStates: ["RELEASED", "PRESSED"], accent: "#ef4444", icon: HiOutlineStopCircle },
  { id: "emergency-stop", type: "emergencyStop", name: "Emergency Stop", shortName: "E-STOP", category: "Control", terminals: [{ id: "21", label: "21", kind: "control", position: "top" }, { id: "22", label: "22", kind: "control", position: "bottom" }], properties: { contact: "NC", locking: true }, defaultState: "RELEASED", interactiveStates: ["RELEASED", "LOCKED"], accent: "#ef4444", icon: HiOutlineExclamationTriangle },
  { id: "selector", type: "selector", name: "Selector Switch", shortName: "SA", category: "Control", terminals: [{ id: "com", label: "COM", kind: "control", position: "top" }, { id: "no", label: "NO", kind: "control", position: "bottom" }, { id: "nc", label: "NC", kind: "control", position: "bottom" }], properties: { positions: 2 }, defaultState: "AUTO", interactiveStates: ["AUTO", "MANUAL"], accent: "#eab308", icon: HiOutlineAdjustmentsHorizontal },
  { id: "limit-switch", type: "limitSwitch", name: "Limit Switch", shortName: "LS", category: "Control", terminals: [{ id: "com", label: "COM", kind: "signal", position: "top" }, { id: "no", label: "NO", kind: "signal", position: "bottom" }, { id: "nc", label: "NC", kind: "signal", position: "bottom" }], properties: { contact: "1NO/1NC" }, defaultState: "OPEN", interactiveStates: ["OPEN", "CLOSED"], accent: "#14b8a6", icon: TbPlugConnected },
  { id: "motor", type: "motor", name: "Motor", shortName: "M", category: "Load", terminals: [{ id: "u", label: "U", kind: "power", position: "top" }, { id: "v", label: "V", kind: "power", position: "top" }, { id: "w", label: "W", kind: "power", position: "top" }], properties: { power: "2.2 kW", voltage: "400 VAC" }, defaultState: "STOPPED", interactiveStates: ["STOPPED", "RUNNING"], accent: "#22c55e", icon: HiOutlineCircleStack },
  { id: "indicator", type: "indicator", name: "Indicator Lamp", shortName: "HL", category: "Load", terminals: [{ id: "x1", label: "X1", kind: "control", position: "top" }, { id: "x2", label: "X2", kind: "control", position: "bottom" }], properties: { color: "Green", voltage: "24 VDC" }, defaultState: "OFF", interactiveStates: ["OFF", "ON"], accent: "#84cc16", icon: HiOutlineLightBulb },
  { id: "sensor", type: "sensor", name: "Sensor", shortName: "B1", category: "Control", terminals: [{ id: "v", label: "+V", kind: "signal", position: "top" }, { id: "zero", label: "0V", kind: "signal", position: "bottom" }, { id: "out", label: "OUT", kind: "signal", position: "bottom" }], properties: { kind: "Proximity", range: "8 mm" }, defaultState: "CLEAR", interactiveStates: ["CLEAR", "DETECTED"], accent: "#06b6d4", icon: MdOutlineSensors },
  { id: "vfd", type: "vfd", name: "VFD", shortName: "VFD", category: "Drive", terminals: [{ id: "r", label: "R", kind: "power", position: "top" }, { id: "s", label: "S", kind: "power", position: "top" }, { id: "t", label: "T", kind: "power", position: "top" }, { id: "u", label: "U", kind: "power", position: "bottom" }, { id: "v", label: "V", kind: "power", position: "bottom" }, { id: "w", label: "W", kind: "power", position: "bottom" }, { id: "di1", label: "DI1", kind: "signal", position: "left" }, { id: "com", label: "COM", kind: "signal", position: "right" }], properties: { power: "2.2 kW", frequency: "0–50 Hz" }, defaultState: "READY", interactiveStates: ["READY", "RUN 35 Hz", "STOPPED"], accent: "#8b5cf6", icon: LuGauge },
  { id: "timer-relay", type: "timerRelay", name: "Timer Relay", shortName: "KT", category: "Control", terminals: [{ id: "a1", label: "A1", kind: "control", position: "left" }, { id: "a2", label: "A2", kind: "control", position: "right" }, { id: "15", label: "15", kind: "control", position: "top" }, { id: "16", label: "16", kind: "control", position: "bottom" }, { id: "18", label: "18", kind: "control", position: "bottom" }], properties: { delay: "3 s", contact: "1CO" }, defaultState: "OFF", interactiveStates: ["OFF", "DONE"], accent: "#8b5cf6", icon: LuGauge },
  { id: "aux-contact", type: "auxContact", name: "Auxiliary Contact", shortName: "KAUX", category: "Control", terminals: [{ id: "com", label: "COM", kind: "control", position: "top" }, { id: "nc", label: "NC", kind: "control", position: "bottom" }, { id: "no", label: "NO", kind: "control", position: "bottom" }], properties: { contact: "1NO/1NC" }, defaultState: "OFF", interactiveStates: ["OFF", "ON"], accent: "#6366f1", icon: LuGitBranch },
  { id: "control-transformer", type: "transformer", name: "Control Transformer", shortName: "T1", category: "Supply", terminals: [{ id: "l1", label: "L1", kind: "power", position: "top" }, { id: "l2", label: "L2", kind: "power", position: "top" }, { id: "x1", label: "X1", kind: "control", position: "bottom" }, { id: "x2", label: "X2", kind: "control", position: "bottom" }], properties: { primary: "400 VAC", secondary: "24 VAC" }, defaultState: "READY", interactiveStates: ["READY", "OFF"], accent: "#0ea5e9", icon: HiOutlineBolt },
  { id: "buzzer", type: "buzzer", name: "Buzzer", shortName: "BZ", category: "Load", terminals: [{ id: "x1", label: "X1", kind: "control", position: "top" }, { id: "x2", label: "X2", kind: "control", position: "bottom" }], properties: { voltage: "24 V", sound: "85 dB" }, defaultState: "OFF", interactiveStates: ["OFF", "ON"], accent: "#ef4444", icon: HiOutlineExclamationTriangle },
  { id: "potentiometer", type: "potentiometer", name: "Potentiometer", shortName: "VR", category: "Control", terminals: [{ id: "1", label: "1", kind: "signal", position: "bottom" }, { id: "w", label: "W", kind: "signal", position: "top" }, { id: "2", label: "2", kind: "signal", position: "bottom" }], properties: { resistance: "10 kΩ", positions: 3 }, defaultState: "LOW", interactiveStates: ["LOW", "MID", "HIGH"], accent: "#eab308", icon: HiOutlineAdjustmentsHorizontal },
  { id: "ammeter", type: "ammeter", name: "Ammeter", shortName: "A", category: "Utility", terminals: [{ id: "in", label: "+", kind: "power", position: "top" }, { id: "out", label: "−", kind: "power", position: "bottom" }], properties: { range: "0–20 A" }, defaultState: "READY", interactiveStates: ["READY", "HOLD"], accent: "#14b8a6", icon: TbCircuitAmmeter },
  { id: "terminal-block", type: "terminalBlock", name: "Terminal Block", shortName: "XT", category: "Utility", terminals: [{ id: "in1", label: "1", kind: "power", position: "top" }, { id: "in2", label: "2", kind: "power", position: "top" }, { id: "in3", label: "3", kind: "power", position: "top" }, { id: "in4", label: "4", kind: "power", position: "top" }, { id: "in5", label: "5", kind: "power", position: "top" }, { id: "out1", label: "1′", kind: "power", position: "bottom" }, { id: "out2", label: "2′", kind: "power", position: "bottom" }, { id: "out3", label: "3′", kind: "power", position: "bottom" }, { id: "out4", label: "4′", kind: "power", position: "bottom" }, { id: "out5", label: "5′", kind: "power", position: "bottom" }], properties: { ways: 5 }, defaultState: "PASSIVE", interactiveStates: ["PASSIVE", "ISOLATED"], accent: "#64748b", icon: MdOutlineElectricMeter },
];

export const exercises: Exercise[] = [
  { id: "start-stop", number: 1, title: "Start / Stop Motor", difficulty: "Beginner", objective: "สร้างวงจรควบคุมพื้นฐานให้มอเตอร์เริ่มและหยุดได้อย่างปลอดภัย", requiredComponents: ["dcPower", "breaker", "stopButton", "startButton", "contactor", "motor"], circuitRequirements: ["STOP ใช้หน้าสัมผัส NC", "START ใช้หน้าสัมผัส NO", "คอยล์ Contactor ต้องมีทางกลับแหล่งจ่าย"], expectedConnections: [{ fromType: "dcPower", toType: "breaker", label: "Control supply → Breaker" }, { fromType: "breaker", toType: "stopButton", label: "Breaker → STOP" }, { fromType: "stopButton", toType: "startButton", label: "STOP → START" }, { fromType: "startButton", toType: "contactor", label: "START → Contactor coil" }, { fromType: "contactor", toType: "motor", label: "Contactor → Motor" }], instructions: ["วางอุปกรณ์ที่ Required ให้ครบ", "เลือก Wire แล้วคลิก Terminal ต้นทางและปลายทาง", "กด CHECK CIRCUIT เพื่อตรวจลำดับวงจร", "เมื่อผ่านแล้วจึงเริ่ม Simulation"] },
  { id: "dol", number: 2, title: "Direct On Line - DOL", difficulty: "Beginner", objective: "ต่อวงจรกำลังและวงจรควบคุม DOL Starter", requiredComponents: ["acPower", "breaker", "contactor", "overload", "motor", "startButton", "stopButton"], circuitRequirements: ["Power: Supply → Breaker → Contactor → Overload → Motor", "Control: STOP → START → Coil", "Overload NC อยู่ในวงจรควบคุม"], expectedConnections: [{ fromType: "acPower", toType: "breaker", label: "Power supply → Breaker" }, { fromType: "breaker", toType: "contactor", label: "Breaker → Contactor" }, { fromType: "contactor", toType: "overload", label: "Contactor → Overload" }, { fromType: "overload", toType: "motor", label: "Overload → Motor" }, { fromType: "breaker", toType: "stopButton", label: "Control supply → STOP" }, { fromType: "stopButton", toType: "startButton", label: "STOP → START" }, { fromType: "startButton", toType: "contactor", label: "START → Contactor coil" }], instructions: ["สร้างวงจรกำลังก่อน", "เพิ่มวงจรควบคุม Start/Stop", "ตรวจขั้ว A1/A2 และ 95/96", "ตรวจวงจรก่อนจำลอง"] },
  { id: "forward", number: 3, title: "Forward Motor", difficulty: "Beginner", objective: "ควบคุมมอเตอร์ให้หมุนเดินหน้าและหยุดได้", requiredComponents: ["acPower", "breaker", "contactor", "overload", "motor"], circuitRequirements: ["ลำดับเฟสตรง", "มี overload protection"], expectedConnections: [{ fromType: "acPower", toType: "breaker", label: "Supply → Breaker" }, { fromType: "breaker", toType: "contactor", label: "Breaker → Forward contactor" }, { fromType: "contactor", toType: "overload", label: "Contactor → Overload" }, { fromType: "overload", toType: "motor", label: "Overload → Motor" }], instructions: ["ต่อวงจรกำลังตามลำดับ", "ตรวจลำดับเฟส", "เพิ่มวงจรสั่งงาน", "ทดสอบสถานะ Forward"] },
  { id: "reverse", number: 4, title: "Reverse Motor", difficulty: "Intermediate", objective: "สลับสองเฟสเพื่อให้มอเตอร์หมุนย้อนกลับ", requiredComponents: ["acPower", "breaker", "contactor", "overload", "motor"], circuitRequirements: ["สลับเฟสสองเส้น", "มี electrical interlock"], expectedConnections: [{ fromType: "acPower", toType: "breaker", label: "Supply → Breaker" }, { fromType: "breaker", toType: "contactor", label: "Breaker → Reverse contactor" }, { fromType: "contactor", toType: "motor", label: "Reversed phases → Motor" }], instructions: ["เตรียม power circuit", "กำหนดการสลับเฟส", "ตรวจ interlock", "ทดสอบทิศทาง"] },
  { id: "forward-reverse", number: 5, title: "Forward / Reverse", difficulty: "Intermediate", objective: "สร้างวงจรกลับทางหมุนพร้อม interlock", requiredComponents: ["acPower", "breaker", "contactor", "overload", "motor", "relay"], circuitRequirements: ["ใช้ contactor สองตัว", "มี mechanical/electrical interlock", "ห้าม contactor ทำงานพร้อมกัน"], expectedConnections: [{ fromType: "acPower", toType: "breaker", label: "Supply → Breaker" }, { fromType: "breaker", toType: "contactor", label: "Breaker → Contactors" }, { fromType: "contactor", toType: "overload", label: "Contactors → Overload" }, { fromType: "overload", toType: "motor", label: "Overload → Motor" }], instructions: ["วาง contactor จำนวน 2 ตัว", "ต่อ main circuit", "ต่อ interlock contact", "ตรวจทั้ง Forward และ Reverse"] },
  { id: "star-delta", number: 6, title: "Star Delta Starter", difficulty: "Advanced", objective: "ลดกระแสเริ่มต้นด้วยวงจร Star–Delta", requiredComponents: ["acPower", "breaker", "contactor", "overload", "motor", "relay"], circuitRequirements: ["ใช้ contactor 3 ตัว", "มี timer sequence", "Star และ Delta มี interlock"], expectedConnections: [{ fromType: "acPower", toType: "breaker", label: "Supply → Breaker" }, { fromType: "breaker", toType: "contactor", label: "Breaker → Main contactor" }, { fromType: "contactor", toType: "motor", label: "Star/Delta group → Motor" }], instructions: ["วาง Main, Star, Delta contactor", "กำหนด timer relay", "ต่อ interlock", "ตรวจ sequence"] },
  { id: "overload-protection", number: 7, title: "Motor Overload Protection", difficulty: "Intermediate", objective: "ออกแบบให้ overload ตัดทั้งกำลังและคำสั่ง", requiredComponents: ["acPower", "breaker", "contactor", "overload", "motor"], circuitRequirements: ["Overload อยู่ก่อน Motor", "95–96 ตัดคอยล์ contactor"], expectedConnections: [{ fromType: "contactor", toType: "overload", label: "Contactor → Overload" }, { fromType: "overload", toType: "motor", label: "Overload → Motor" }], instructions: ["ตั้งค่าพิกัด overload", "ต่อ main poles", "ต่อ auxiliary NC", "จำลอง trip"] },
  { id: "limit-control", number: 8, title: "Motor Control with Limit Switch", difficulty: "Intermediate", objective: "หยุดมอเตอร์อัตโนมัติเมื่อถึงตำแหน่ง", requiredComponents: ["dcPower", "breaker", "startButton", "contactor", "limitSwitch", "motor"], circuitRequirements: ["Limit switch อยู่ใน control circuit", "Fail-safe ด้วย NC contact"], expectedConnections: [{ fromType: "breaker", toType: "limitSwitch", label: "Breaker → Limit switch" }, { fromType: "limitSwitch", toType: "contactor", label: "Limit switch → Coil" }, { fromType: "contactor", toType: "motor", label: "Contactor → Motor" }], instructions: ["ต่อวงจรเริ่มทำงาน", "เพิ่ม limit switch อนุกรม", "ตรวจ contact type", "ทดสอบ limit reached"] },
  { id: "sensor-control", number: 9, title: "Motor Control with Sensor", difficulty: "Intermediate", objective: "ใช้ Sensor เป็นเงื่อนไขควบคุมมอเตอร์", requiredComponents: ["dcPower", "breaker", "sensor", "relay", "contactor", "motor"], circuitRequirements: ["Sensor มี supply ถูก polarity", "Output ขับ relay/control input"], expectedConnections: [{ fromType: "dcPower", toType: "sensor", label: "24 VDC → Sensor" }, { fromType: "sensor", toType: "relay", label: "Sensor output → Relay" }, { fromType: "relay", toType: "contactor", label: "Relay → Contactor" }, { fromType: "contactor", toType: "motor", label: "Contactor → Motor" }], instructions: ["จ่ายไฟให้ sensor", "ต่อ output ไป relay", "ต่อ relay ไป coil", "ทดสอบ detected/clear"] },
  { id: "vfd-control", number: 10, title: "VFD Motor Control", difficulty: "Advanced", objective: "ควบคุม Run/Stop และความเร็วมอเตอร์ผ่าน VFD", requiredComponents: ["acPower", "breaker", "vfd", "motor", "selector"], circuitRequirements: ["Supply เข้าขั้ว R/S/T", "Motor ต่อ U/V/W", "คำสั่ง Run เข้าขั้ว DI"], expectedConnections: [{ fromType: "acPower", toType: "breaker", label: "Supply → Breaker" }, { fromType: "breaker", toType: "vfd", label: "Breaker → VFD input" }, { fromType: "vfd", toType: "motor", label: "VFD output → Motor" }, { fromType: "selector", toType: "vfd", label: "Run selector → DI1" }], instructions: ["ต่อ input power", "ต่อ motor output", "ต่อ digital input", "กำหนด frequency และทดสอบ"] },
];

export const featuredTopics = [
  { label: "Motor", icon: HiOutlineCircleStack },
  { label: "Contactor", icon: TbCircuitAmmeter },
  { label: "Relay", icon: LuGitBranch },
  { label: "Overload", icon: HiOutlineShieldCheck },
  { label: "DOL", icon: HiOutlineBolt },
  { label: "Forward Reverse", icon: LuGitBranch },
  { label: "Star Delta", icon: TbCircuitSwitchOpen },
  { label: "VFD", icon: LuGauge },
  { label: "Control Circuit", icon: LuRadioTower },
  { label: "Power Circuit", icon: TbPlugConnected },
];
