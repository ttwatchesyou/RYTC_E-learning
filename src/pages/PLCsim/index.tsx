import Head from "next/head";
import { DragEvent, PointerEvent, useEffect, useMemo, useState } from "react";
import {
  HiArrowLeft,
  HiChevronDown,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowPath,
  HiOutlineBolt,
  HiOutlineBookOpen,
  HiOutlineCpuChip,
  HiOutlineCursorArrowRays,
  HiOutlineDocumentDuplicate,
  HiOutlineLightBulb,
  HiOutlineMinus,
  HiOutlinePlay,
  HiOutlinePlus,
  HiOutlineRectangleGroup,
  HiOutlineSignal,
  HiOutlineSquare3Stack3D,
  HiOutlineStop,
  HiOutlineTrash,
} from "react-icons/hi2";
import { ExtendedElementType, ExtendedLadderElement, ExtendedLadderRung } from "../../types/plc";
import { executeScanCycle, getRungWiringIssue, MemoryState } from "../../utils/plcEngine";
import styles from "./PLCSim.module.css";

// react-icons v5 exposes ReactNode return types that are wider than Next 13's JSX
// runtime accepts, so this compatibility map keeps the page strongly typed elsewhere.
const Icon = {
  Adjust: HiOutlineAdjustmentsHorizontal as any,
  ArrowLeft: HiArrowLeft as any,
  ChevronDown: HiChevronDown as any,
  Refresh: HiOutlineArrowPath as any,
  Bolt: HiOutlineBolt as any,
  Book: HiOutlineBookOpen as any,
  Cpu: HiOutlineCpuChip as any,
  Cursor: HiOutlineCursorArrowRays as any,
  Duplicate: HiOutlineDocumentDuplicate as any,
  Bulb: HiOutlineLightBulb as any,
  Wire: HiOutlineMinus as any,
  Play: HiOutlinePlay as any,
  Plus: HiOutlinePlus as any,
  Design: HiOutlineRectangleGroup as any,
  Signal: HiOutlineSignal as any,
  Ladder: HiOutlineSquare3Stack3D as any,
  Stop: HiOutlineStop as any,
  Trash: HiOutlineTrash as any,
};

type ViewMode = "ladder" | "hmi";
type PlcMode = "PROGRAM" | "STOP" | "RUN" | "FAULT";
type Tool = { type: ExtendedElementType; title: string; symbol: string; hint: string };
type LadderDragData =
  | { kind: "new-element"; type: ExtendedElementType }
  | { kind: "new-wire" }
  | { kind: "new-vertical-wire" }
  | { kind: "element"; rungId: string; elementId: string }
  | { kind: "wire"; rungId: string; wireId: string };
type HmiWidgetKind = "button" | "switch" | "lamp" | "gauge" | "numeric" | "tank" | "alarm" | "label";
type HmiWidget = {
  id: string;
  kind: HmiWidgetKind;
  address?: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};
type AddressProfile = { input: string; output: string; timer: string; counter: string };
type PLCBrandOption = {
  id: string;
  name: string;
  software: string;
  color: string;
  code: string;
  profile: AddressProfile;
};
type Lesson = { id: number; title: string; subtitle: string; objective: string; level: "พื้นฐาน" | "กลาง" | "ประยุกต์" };
type WorkspaceIdentity = { primary: string; secondary: string };
type BrandGuide = { software: string; input: string; output: string; timer: string; program: string; contact: string; coil: string; online: string; connect: string; steps: string[]; tip: string };

const brands: PLCBrandOption[] = [
  { id: "SIEMENS", name: "Siemens", software: "TIA Portal", color: "#008c95", code: "S7", profile: { input: "I0.", output: "Q0.", timer: "T", counter: "C" } },
  { id: "MITSUBISHI", name: "Mitsubishi", software: "GX Works", color: "#e60012", code: "MEL", profile: { input: "X", output: "Y", timer: "T", counter: "C" } },
  { id: "OMRON", name: "OMRON", software: "CX-Programmer / Sysmac", color: "#1873c9", code: "OM", profile: { input: "0.", output: "100.", timer: "T", counter: "C" } },
  { id: "ALLEN_BRADLEY", name: "Allen-Bradley", software: "Studio 5000", color: "#d71920", code: "AB", profile: { input: "Local:1:I.Data.", output: "Local:2:O.Data.", timer: "T4:", counter: "C5:" } },
  { id: "SCHNEIDER", name: "Schneider", software: "EcoStruxure", color: "#36a549", code: "SE", profile: { input: "%I0.", output: "%Q0.", timer: "%TM", counter: "%C" } },
  { id: "DELTA", name: "Delta", software: "ISPSoft", color: "#1769aa", code: "Δ", profile: { input: "X", output: "Y", timer: "T", counter: "C" } },
  { id: "PANASONIC", name: "Panasonic", software: "FPWIN Pro", color: "#155fa0", code: "P", profile: { input: "X", output: "Y", timer: "T", counter: "C" } },
  { id: "UNIVERSAL", name: "IEC Universal", software: "IEC 61131-3", color: "#695ee8", code: "IEC", profile: { input: "%IX0.", output: "%QX0.", timer: "TON", counter: "CTU" } },
];

const workspaceIdentity: Record<string, WorkspaceIdentity> = {
  SIEMENS: { primary: "Main [OB1]", secondary: "Organization block · LAD · TIA Portal" },
  MITSUBISHI: { primary: "MAIN", secondary: "Program file · Ladder · GX Works" },
  OMRON: { primary: "[Program Name : {project}]", secondary: "[Section Name : Section1]" },
  ALLEN_BRADLEY: { primary: "MainProgram / MainRoutine", secondary: "Controller Organizer · Ladder Routine" },
  SCHNEIDER: { primary: "MAST / Main", secondary: "Program Organization Unit · LD" },
  DELTA: { primary: "MAIN / POU_1", secondary: "ISPSoft · Ladder Diagram" },
  PANASONIC: { primary: "Program1 / Body", secondary: "FPWIN Pro · Ladder Diagram" },
  UNIVERSAL: { primary: "PLC_PRG", secondary: "IEC 61131-3 · Ladder Diagram (LD)" },
};

const tools: Tool[] = [
  { type: "NO", title: "Normally Open", symbol: "—| |—", hint: "คอนแทค NO" },
  { type: "NC", title: "Normally Closed", symbol: "—|/|—", hint: "คอนแทค NC" },
  { type: "COIL", title: "Output Coil", symbol: "—○—", hint: "เอาต์พุต" },
  { type: "SET", title: "Set Coil", symbol: "—Ⓢ—", hint: "สั่งค้าง ON" },
  { type: "RSET", title: "Reset Coil", symbol: "—Ⓡ—", hint: "ยกเลิกสถานะ" },
  { type: "TIM", title: "On-delay Timer", symbol: "TON", hint: "หน่วงเวลา" },
  { type: "CNT", title: "Up Counter", symbol: "CTU", hint: "ตัวนับ" },
  { type: "DIFU", title: "Differentiate Up", symbol: "DIFU", hint: "พัลส์ขอบขาขึ้น" },
  { type: "DIFD", title: "Differentiate Down", symbol: "DIFD", hint: "พัลส์ขอบขาลง" },
];

const formatDeviceAddress = (profile: AddressProfile, area: keyof AddressProfile, index: number) => {
  const prefix = profile[area];
  if (profile.input === "0.") {
    if (area === "input" || area === "output") return `${prefix}${String(index).padStart(2, "0")}`;
    return `${prefix}${String(index).padStart(3, "0")}`;
  }
  return `${prefix}${index}`;
};

const lessons: Lesson[] = [
  { id: 1, title: "รู้จัก Contact และ Coil", subtitle: "วงจรเปิด–ปิด Output แรก", objective: "เข้าใจ NO Contact, Scan cycle และ Output Coil", level: "พื้นฐาน" },
  { id: 2, title: "วงจร START / STOP", subtitle: "ควบคุมมอเตอร์อย่างปลอดภัย", objective: "ใช้ NO และ NC ร่วมกันเพื่อควบคุมมอเตอร์", level: "พื้นฐาน" },
  { id: 3, title: "วงจรค้างสถานะ", subtitle: "Motor holding circuit", objective: "เรียนรู้การอ้างสถานะ Output และไฟแสดงผล", level: "พื้นฐาน" },
  { id: 4, title: "Forward / Reverse", subtitle: "วงจร Interlock มอเตอร์", objective: "ป้องกัน Output เดินหน้าและถอยหลังทำงานพร้อมกัน", level: "กลาง" },
  { id: 5, title: "Timer หน่วงเวลา", subtitle: "On-delay Timer (TON)", objective: "ตั้ง Preset และสั่ง Output หลังครบเวลา", level: "กลาง" },
  { id: 6, title: "Counter นับชิ้นงาน", subtitle: "Up Counter (CTU)", objective: "นับสัญญาณ Sensor และสั่งงานเมื่อครบจำนวน", level: "กลาง" },
  { id: 7, title: "SET และ RESET", subtitle: "จดจำสถานะใน PLC", objective: "สั่งค้างและยกเลิก Output ด้วยคนละเงื่อนไข", level: "กลาง" },
  { id: 8, title: "ควบคุมลำดับ", subtitle: "Sequence control", objective: "สร้างกระบวนการสองขั้นด้วย Timer และสถานะภายใน", level: "ประยุกต์" },
  { id: 9, title: "ระบบ Alarm", subtitle: "ตรวจจับและแจ้งเตือน", objective: "สร้าง Alarm output และไฟเตือนจาก Sensor", level: "ประยุกต์" },
  { id: 10, title: "PLC เชื่อมต่อ HMI", subtitle: "โปรเจกต์ Motor Control", objective: "เชื่อม Button, Lamp, Gauge และ Alarm กับ Ladder", level: "ประยุกต์" },
];

const brandGuides: Record<string, BrandGuide> = {
  SIEMENS: { software: "TIA Portal", input: "I0.0", output: "Q0.0", timer: "TON / IEC Timer", program: "OB1 / Network", contact: "NO / NC", coil: "Coil / S / R", online: "Download to device → Go online", connect: "สร้าง Project → Add device ตระกูล S7 → เลือก CPU", steps: ["สร้าง Organization Block OB1", "ลาก Contact และ Coil ลงใน Network", "Compile และ Download to device", "Online monitoring แล้วสลับ Input"], tip: "ใช้ Symbolic tag เพื่อให้โปรแกรมอ่านง่ายกว่าการจำ Address" },
  MITSUBISHI: { software: "GX Works", input: "X0", output: "Y0", timer: "T0", program: "MAIN / Program File", contact: "LD / LDI", coil: "OUT / SET / RST", online: "Write to PLC → Monitor", connect: "สร้าง New Project → เลือก PLC Series และ CPU", steps: ["เปิด MAIN Program", "วาง LD/LDI และ OUT", "Convert/Build โปรแกรม", "Write to PLC แล้วเปลี่ยนเป็น RUN"], tip: "X คือ Input, Y คือ Output และ M ใช้เป็น Internal relay" },
  OMRON: { software: "CX-Programmer / Sysmac", input: "0.00", output: "100.00", timer: "T000 / TIM", program: "Program / Section", contact: "LD / LD NOT", coil: "OUT / SET / RSET", online: "Transfer to PLC → Monitor", connect: "สร้าง Project → เลือก Device type และ CPU", steps: ["สร้าง Section ใน Program", "วาง Contact, TIM และ Output Coil", "Program Check เพื่อหาข้อผิดพลาด", "Transfer to PLC และเปิด Monitor Mode"], tip: "Timer TIM ใช้ฐานเวลา 0.1 วินาที และ CIO Address แยก Input/Output" },
  ALLEN_BRADLEY: { software: "Studio 5000", input: "Local:1:I.Data.0", output: "Local:2:O.Data.0", timer: "TON", program: "Program / Routine", contact: "XIC / XIO", coil: "OTE / OTL / OTU", online: "Download → Remote Run", connect: "สร้าง Controller Project → เพิ่ม I/O Module ใน I/O Configuration", steps: ["เปิด MainRoutine", "ใช้ XIC/XIO และ OTE", "Verify Controller", "Download แล้วเปลี่ยน Controller เป็น Remote Run"], tip: "นิยมใช้ Controller Tags แทน Physical Address โดยตรง" },
  SCHNEIDER: { software: "EcoStruxure Machine Expert", input: "%I0.0", output: "%Q0.0", timer: "TON", program: "MAST / POU", contact: "Contact / Negated", coil: "Coil / Set / Reset", online: "Login → Download → Start", connect: "สร้าง Machine Expert Project → เลือก Controller", steps: ["สร้าง POU แบบ LD", "ประกาศ Variable และ Mapping I/O", "Build Application", "Login, Download และ Start Application"], tip: "ตั้งชื่อตัวแปรใน Global Variable List แล้ว Map ไปยัง %I/%Q" },
  DELTA: { software: "ISPSoft", input: "X0", output: "Y0", timer: "T0", program: "MAIN / POU", contact: "LD / LDI", coil: "OUT / SET / RST", online: "Download → Online Mode", connect: "สร้าง Project → เลือก DVP/AH Series", steps: ["เปิด POU MAIN", "วาง Contact และ OUT", "Compile โปรแกรม", "Download ผ่าน COM/Ethernet และ RUN"], tip: "ตรวจ Communication Setting และ Station Address ก่อน Download" },
  PANASONIC: { software: "FPWIN Pro", input: "X0", output: "Y0", timer: "T0", program: "Program / Body", contact: "ST / ST NOT", coil: "OT / SET / RST", online: "Online → Download → RUN", connect: "สร้าง Project → เลือก FP Series CPU", steps: ["สร้าง Program และ LD Body", "ประกาศ Variable หรือใช้ Device Address", "Check Project", "Online → Download Program → RUN"], tip: "ใช้ Comment และ Variable name เพื่ออธิบายอุปกรณ์ทุกจุด" },
  UNIVERSAL: { software: "IEC 61131-3 Editor", input: "%IX0.0", output: "%QX0.0", timer: "TON", program: "PLC_PRG / POU", contact: "Contact / NC Contact", coil: "Coil / Set / Reset", online: "Login → Download → Start", connect: "สร้าง Standard Project → เลือก Runtime/Target", steps: ["สร้าง POU ชื่อ PLC_PRG", "เลือกภาษา Ladder Diagram", "Build Application", "Login, Download และ Start"], tip: "แนวคิด IEC ใช้ได้กับหลายค่าย แต่ Address mapping ต้องตรวจตาม Target" },
};

const starterRungs: ExtendedLadderRung[] = [
  {
    id: "rung-1",
    mainElements: [
      { id: "e-1", type: "NO", rawAddress: "I0.0", label: "START", x: 84 },
      { id: "e-2", type: "NC", rawAddress: "I0.1", label: "STOP", x: 252 },
      { id: "e-3", type: "COIL", rawAddress: "Q0.0", label: "MOTOR", x: 420 },
    ],
    wires: [{ id: "wire-1a", x: 0, width: 84 }, { id: "wire-1b", x: 168, width: 84 }, { id: "wire-1c", x: 336, width: 84 }],
    branches: [{ id: "branch-1", startX: 0, endX: 168, elements: [{ id: "branch-e-1", type: "NO", rawAddress: "Q0.0", label: "MOTOR", x: 84 }] }],
  },
  {
    id: "rung-2",
    mainElements: [
      { id: "e-4", type: "NO", rawAddress: "Q0.0", label: "MOTOR", x: 84 },
      { id: "e-5", type: "COIL", rawAddress: "Q0.1", label: "RUN LAMP", x: 252 },
    ],
    wires: [{ id: "wire-2a", x: 0, width: 84 }, { id: "wire-2b", x: 168, width: 84 }],
  },
];

const toolByType = (type: ExtendedElementType) => tools.find((tool) => tool.type === type);

const createStarterProject = (profile: AddressProfile) => {
  const input = (index: number) => formatDeviceAddress(profile, "input", index);
  const output = (index: number) => formatDeviceAddress(profile, "output", index);
  const projectRungs: ExtendedLadderRung[] = [
    {
      id: "rung-1",
      mainElements: [
        { id: "e-1", type: "NO", rawAddress: input(0), label: "START", x: 84 },
        { id: "e-2", type: "NC", rawAddress: input(1), label: "STOP", x: 252 },
        { id: "e-3", type: "COIL", rawAddress: output(0), label: "MOTOR", x: 420 },
      ],
      wires: [{ id: "wire-1a", x: 0, width: 84 }, { id: "wire-1b", x: 168, width: 84 }, { id: "wire-1c", x: 336, width: 84 }],
      branches: [{ id: "branch-1", startX: 0, endX: 168, elements: [{ id: "branch-e-1", type: "NO", rawAddress: output(0), label: "MOTOR", x: 84 }] }],
    },
    {
      id: "rung-2",
      mainElements: [
        { id: "e-4", type: "NO", rawAddress: output(0), label: "MOTOR", x: 84 },
        { id: "e-5", type: "COIL", rawAddress: output(1), label: "RUN LAMP", x: 252 },
      ],
      wires: [{ id: "wire-2a", x: 0, width: 84 }, { id: "wire-2b", x: 168, width: 84 }],
    },
  ];
  return {
    rungs: projectRungs,
    memory: { [input(0)]: false, [input(1)]: false, [output(0)]: false, [output(1)]: false },
    widgets: [
      { id: "w1", kind: "label", label: "MOTOR CONTROL", x: 24, y: 18, width: 340, height: 62, color: "#0e5d98" },
      { id: "w2", kind: "lamp", address: output(1), label: "RUN", x: 430, y: 24, width: 150, height: 140, color: "#ffc928" },
      { id: "w3", kind: "button", address: input(0), label: "START", x: 70, y: 135, width: 170, height: 120, color: "#0e5d98" },
      { id: "w4", kind: "button", address: input(1), label: "STOP", x: 270, y: 135, width: 170, height: 120, color: "#e04b45" },
    ] as HmiWidget[],
  };
};

const createLessonProject = (lessonId: number, profile: AddressProfile) => {
  const input = (index: number) => formatDeviceAddress(profile, "input", index);
  const output = (index: number) => formatDeviceAddress(profile, "output", index);
  const timer = (index: number) => formatDeviceAddress(profile, "timer", index);
  const counter = (index: number) => formatDeviceAddress(profile, "counter", index);
  let elementSequence = 0;
  const element = (type: ExtendedElementType, rawAddress: string, label: string, extras: Partial<ExtendedLadderElement> = {}): ExtendedLadderElement => ({
    id: `lesson-${lessonId}-e-${++elementSequence}`, type, rawAddress, label, ...extras,
  });
  const rung = (index: number, elements: ExtendedLadderElement[]): ExtendedLadderRung => ({
    id: `lesson-${lessonId}-rung-${index}`,
    mainElements: elements.map((item, position) => ({ ...item, x: 84 + position * 168 })),
    wires: elements.map((_, position) => ({ id: `lesson-${lessonId}-wire-${index}-${position}`, x: position * 168, width: 84 })),
  });

  const examples: Record<number, ExtendedLadderRung[]> = {
    1: [rung(1, [element("NO", input(0), "SWITCH"), element("COIL", output(0), "LAMP")])],
    2: [rung(1, [element("NO", input(0), "START"), element("NC", input(1), "STOP"), element("COIL", output(0), "MOTOR")])],
    3: [
      rung(1, [element("NO", input(0), "START"), element("NC", input(1), "STOP"), element("COIL", output(0), "MOTOR")]),
      rung(2, [element("NO", output(0), "MOTOR RUN"), element("COIL", output(1), "RUN LAMP")]),
    ],
    4: [
      rung(1, [element("NO", input(0), "FORWARD"), element("NC", output(1), "REV LOCK"), element("COIL", output(0), "MOTOR FWD")]),
      rung(2, [element("NO", input(1), "REVERSE"), element("NC", output(0), "FWD LOCK"), element("COIL", output(1), "MOTOR REV")]),
    ],
    5: [rung(1, [element("NO", input(0), "START"), element("TIM", timer(1), "DELAY 5s", { presetTime: 5 }), element("COIL", output(0), "FAN")])],
    6: [rung(1, [element("NO", input(0), "SENSOR"), element("CNT", counter(1), "COUNT 10", { presetCount: 10 }), element("COIL", output(0), "FULL")])],
    7: [
      rung(1, [element("NO", input(0), "SET PB"), element("SET", output(0), "MEMORY ON")]),
      rung(2, [element("NO", input(1), "RESET PB"), element("RSET", output(0), "MEMORY OFF")]),
    ],
    8: [
      rung(1, [element("NO", input(0), "CYCLE START"), element("TIM", timer(1), "STEP 1", { presetTime: 3 }), element("COIL", output(0), "CONVEYOR")]),
      rung(2, [element("NO", output(0), "STEP 1 DONE"), element("TIM", timer(2), "STEP 2", { presetTime: 5 }), element("COIL", output(1), "CYLINDER")]),
    ],
    9: [
      rung(1, [element("NO", input(0), "OVERLOAD"), element("SET", output(0), "ALARM")]),
      rung(2, [element("NO", output(0), "ALARM ACTIVE"), element("COIL", output(1), "WARNING LAMP")]),
      rung(3, [element("NO", input(1), "ACKNOWLEDGE"), element("RSET", output(0), "ALARM RESET")]),
    ],
    10: [
      rung(1, [element("NO", input(0), "HMI START"), element("NC", input(1), "HMI STOP"), element("COIL", output(0), "MOTOR")]),
      rung(2, [element("NO", output(0), "MOTOR RUN"), element("TIM", timer(1), "RUNTIME", { presetTime: 5 }), element("COIL", output(1), "STATUS")]),
    ],
  };
  if (examples[3]?.[0]) {
    examples[3][0].branches = [{
      id: "lesson-3-seal-in",
      startX: 0,
      endX: 168,
      elements: [element("NO", output(0), "MOTOR HOLD")],
    }];
    examples[3][0].branches[0].elements[0].x = 84;
  }
  const rungs = examples[lessonId] || examples[1];
  const allAddresses = rungs.flatMap((item) => item.mainElements.map((itemElement) => itemElement.rawAddress));
  const memory = Object.fromEntries(allAddresses.map((address) => [address, false])) as MemoryState;
  const widgets: HmiWidget[] = [
    { id: `lesson-${lessonId}-hmi-title`, kind: "label", label: `LESSON ${lessonId} CONTROL`, x: 24, y: 18, width: 330, height: 62, color: "#0e5d98" },
    { id: `lesson-${lessonId}-hmi-input`, kind: "button", address: input(0), label: "START", x: 65, y: 125, width: 170, height: 120, color: "#0e5d98" },
    { id: `lesson-${lessonId}-hmi-output`, kind: lessonId === 9 ? "alarm" : "lamp", address: output(0), label: lessonId === 9 ? "SYSTEM ALARM" : "OUTPUT STATUS", x: 300, y: 115, width: lessonId === 9 ? 260 : 160, height: lessonId === 9 ? 82 : 140, color: lessonId === 9 ? "#ef4b45" : "#ffc928" },
  ];
  if (lessonId === 10) widgets.push({ id: "lesson-10-gauge", kind: "gauge", address: output(1), label: "PROCESS", x: 500, y: 115, width: 170, height: 140, color: "#22a3d6" });
  return { rungs, memory, widgets };
};

export default function PLCSimPage() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("ladder");
  const [isRunning, setIsRunning] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [plcMode, setPlcMode] = useState<PlcMode>("PROGRAM");
  const [scanCount, setScanCount] = useState(0);
  const [scanTimeMs, setScanTimeMs] = useState(0);
  const [plcMessage, setPlcMessage] = useState("พร้อมตรวจสอบและ Download โปรแกรม");
  const [rungs, setRungs] = useState<ExtendedLadderRung[]>(starterRungs);
  const [memory, setMemory] = useState<MemoryState>({ "I0.0": false, "I0.1": false, "Q0.0": false, "Q0.1": false });
  const [selectedRung, setSelectedRung] = useState("rung-1");
  const [selectedElementId, setSelectedElementId] = useState<{ rungId: string; elementId: string } | null>(null);
  const [ladderCursorX, setLadderCursorX] = useState(504);
  const [ladderSelection, setLadderSelection] = useState<{ rungId: string; x: number; width: number; height: number } | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>("w3");
  const [projectName, setProjectName] = useState("Motor starter basics");
  const [showLessons, setShowLessons] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideBrandId, setGuideBrandId] = useState("OMRON");
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<HmiWidget[]>([
    { id: "w1", kind: "label", label: "MOTOR CONTROL", x: 24, y: 18, width: 340, height: 62, color: "#0e5d98" },
    { id: "w2", kind: "lamp", address: "Q0.1", label: "RUN", x: 430, y: 24, width: 150, height: 140, color: "#ffc928" },
    { id: "w3", kind: "button", address: "I0.0", label: "START", x: 70, y: 135, width: 170, height: 120, color: "#0e5d98" },
    { id: "w4", kind: "button", address: "I0.1", label: "STOP", x: 270, y: 135, width: 170, height: 120, color: "#e04b45" },
  ]);

  const activeBrand = brands.find((brand) => brand.id === brandId);
  const activeIdentity = activeBrand ? workspaceIdentity[activeBrand.id] : workspaceIdentity.UNIVERSAL;
  const getInstructionSymbol = (tool: Tool | undefined) => {
    if (!tool) return undefined;
    const overrides: Record<string, Partial<Record<ExtendedElementType, string>>> = {
      OMRON: { TIM: "TIM", CNT: "CNT", COIL: "—○—" },
      SIEMENS: { TIM: "TON", CNT: "CTU", SET: "—(S)—", RSET: "—(R)—" },
      MITSUBISHI: { COIL: "OUT", SET: "SET", RSET: "RST", TIM: "TMR", CNT: "CNT" },
      ALLEN_BRADLEY: { NO: "XIC", NC: "XIO", COIL: "OTE", SET: "OTL", RSET: "OTU", TIM: "TON", CNT: "CTU" },
      SCHNEIDER: { TIM: "TON", CNT: "CTU", SET: "S", RSET: "R" },
      DELTA: { COIL: "OUT", SET: "SET", RSET: "RST", TIM: "TMR", CNT: "CNT" },
      PANASONIC: { COIL: "OUT", SET: "SET", RSET: "RST", TIM: "TMX", CNT: "CT" },
    };
    return (activeBrand && overrides[activeBrand.id]?.[tool.type]) || tool.symbol;
  };
  const filteredBrands = brands.filter((brand) =>
    `${brand.name} ${brand.software}`.toLowerCase().includes(brandQuery.toLowerCase())
  );

  const selectBrand = (brand: PLCBrandOption) => {
    const project = createStarterProject(brand.profile);
    setBrandId(brand.id);
    setRungs(project.rungs);
    setMemory(project.memory);
    setWidgets(project.widgets);
    setSelectedWidgetId("w3");
    setSelectedRung("rung-1");
    setSelectedElementId({ rungId: "rung-1", elementId: "e-1" });
    setLadderSelection(null);
    setLadderCursorX(504);
    setMode("ladder");
    setIsRunning(false);
    setIsDownloaded(false);
    setPlcMode("PROGRAM");
    setScanCount(0);
    setPlcMessage("เลือก PLC แล้ว — กรุณา Download โปรแกรม");
  };

  const loadLesson = (lesson: Lesson) => {
    if (!activeBrand) return;
    const project = createLessonProject(lesson.id, activeBrand.profile);
    setIsRunning(false);
    setIsDownloaded(false);
    setPlcMode("PROGRAM");
    setScanCount(0);
    setPlcMessage(`โหลดบทเรียน ${lesson.id} แล้ว — กรุณา Download`);
    setRungs(project.rungs);
    setMemory(project.memory);
    setWidgets(project.widgets);
    setProjectName(`Lesson ${lesson.id} — ${lesson.title}`);
    setActiveLessonId(lesson.id);
    setSelectedRung(project.rungs[0].id);
    setSelectedElementId({ rungId: project.rungs[0].id, elementId: project.rungs[0].mainElements[0]?.id || "" });
    setLadderSelection(null);
    setSelectedWidgetId(project.widgets[1]?.id || project.widgets[0].id);
    setLadderCursorX(84 + project.rungs[0].mainElements.length * 168);
    setMode("ladder");
    setShowLessons(false);
  };

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setMemory((currentMemory) => {
        const startedAt = performance.now();
        const result = executeScanCycle(rungs, currentMemory);
        setRungs(result.updatedRungs);
        setScanCount((count) => count + 1);
        setScanTimeMs(Math.max(0.1, performance.now() - startedAt));
        return result.updatedMemory;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [isRunning, rungs]);

  const validateProgram = () => {
    const errors: string[] = [];
    rungs.forEach((rung, index) => {
      const wiringIssue = getRungWiringIssue(rung);
      if (wiringIssue) errors.push(`Rung ${index + 1} สายไฟขาด: ${wiringIssue}`);
      const outputs = rung.mainElements.filter((item) => ["COIL", "SET", "RSET", "DIFU", "DIFD"].includes(item.type));
      if (outputs.length > 0 && !["COIL", "SET", "RSET", "DIFU", "DIFD"].includes(rung.mainElements[rung.mainElements.length - 1].type)) errors.push(`Rung ${index + 1} ต้องวาง Output ไว้ท้ายวงจร`);
      rung.mainElements.forEach((item) => { if (!item.rawAddress.trim()) errors.push(`Rung ${index + 1} มี Address ว่าง`); });
    });
    return errors;
  };

  const verifyProgram = () => {
    const errors = validateProgram();
    if (errors.length > 0) {
      setPlcMode("FAULT");
      setPlcMessage(`ตรวจพบ ${errors.length} ข้อผิดพลาด: ${errors[0]}`);
      return false;
    }
    setPlcMode(isDownloaded ? "STOP" : "PROGRAM");
    setPlcMessage(`ตรวจสอบสำเร็จ · ${rungs.length} Rungs · พร้อม Download`);
    return true;
  };

  const downloadProgram = () => {
    setIsRunning(false);
    if (!verifyProgram()) return;
    setIsDownloaded(true);
    setPlcMode("STOP");
    setScanCount(0);
    setPlcMessage("Download สำเร็จ · CPU อยู่ในโหมด STOP");
  };

  const startPlc = () => {
    const errors = validateProgram();
    if (errors.length > 0) {
      setPlcMode("FAULT");
      setPlcMessage(`RUN ไม่ได้ · ${errors[0]}`);
      return;
    }
    if (!isDownloaded) {
      setIsDownloaded(true);
      setScanCount(0);
    }
    setPlcMode("RUN");
    setIsRunning(true);
    setPlcMessage(isDownloaded ? "CPU RUN · กำลังประมวลผล Scan cycle" : "Auto Download สำเร็จ · CPU RUN");
  };

  const stopPlc = () => {
    setIsRunning(false);
    setMemory((current) => Object.fromEntries(Object.keys(current).map((address) => [address, false])) as MemoryState);
    setRungs((items) => items.map((rung) => ({
      ...rung,
      mainElements: rung.mainElements.map((item) => ({
        ...item,
        state: false,
        currentTime: 0,
        currentCount: 0,
        lastRungPower: false,
      })),
      branches: rung.branches?.map((branch) => ({ ...branch, elements: branch.elements.map((item) => ({ ...item, state: false })) })),
    })));
    setScanCount(0);
    setScanTimeMs(0);
    setPlcMode(isDownloaded ? "STOP" : "PROGRAM");
    setPlcMessage("CPU STOP · Runtime, I/O, Timer และ Counter กลับสู่ค่าเริ่มต้น");
  };

  const singleScan = () => {
    if (!isDownloaded || isRunning) {
      setPlcMessage("Single Scan ใช้ได้หลัง Download และอยู่ในโหมด STOP");
      return;
    }
    const startedAt = performance.now();
    const result = executeScanCycle(rungs, memory);
    setRungs(result.updatedRungs);
    setMemory(result.updatedMemory);
    setScanCount((count) => count + 1);
    setScanTimeMs(Math.max(0.1, performance.now() - startedAt));
    setPlcMessage("ประมวลผล Single Scan สำเร็จ");
  };

  const resetCpu = () => {
    setIsRunning(false);
    setMemory((current) => Object.fromEntries(Object.keys(current).map((address) => [address, false])) as MemoryState);
    setRungs((items) => items.map((rung) => ({ ...rung, mainElements: rung.mainElements.map((item) => ({ ...item, state: false, currentTime: 0, currentCount: 0, lastRungPower: false })), branches: rung.branches?.map((branch) => ({ ...branch, elements: branch.elements.map((item) => ({ ...item, state: false })) })) })));
    setScanCount(0);
    setScanTimeMs(0);
    setPlcMode(isDownloaded ? "STOP" : "PROGRAM");
    setPlcMessage("Reset CPU และ Memory เรียบร้อย");
  };

  const toggleInputAddress = (address: string) => {
    const nextState = !Boolean(memory[address]);
    setMemory((current) => ({ ...current, [address]: nextState }));
    setPlcMessage(`Input ${address} = ${nextState ? "ON" : "OFF"}${isRunning ? "" : " · กด RUN เพื่อประมวลผล Output"}`);
  };

  const resetSelectedTimer = () => {
    if (!selectedElementId || !selectedElement || selectedElement.type !== "TIM") return;
    setRungs((items) => items.map((rung) => rung.id === selectedElementId.rungId ? {
      ...rung,
      mainElements: rung.mainElements.map((element) => element.id === selectedElement.id ? { ...element, currentTime: 0, state: false } : element),
    } : rung));
    setMemory((current) => ({ ...current, [selectedElement.rawAddress]: false }));
    setPlcMessage(`Reset Timer ${selectedElement.rawAddress} แล้ว`);
  };

  const resetSelectedCounter = () => {
    if (!selectedElementId || !selectedElement || selectedElement.type !== "CNT") return;
    setRungs((items) => items.map((rung) => rung.id === selectedElementId.rungId ? {
      ...rung,
      mainElements: rung.mainElements.map((element) => element.id === selectedElement.id ? { ...element, currentCount: 0, lastRungPower: false, state: false } : element),
    } : rung));
    setMemory((current) => ({ ...current, [selectedElement.rawAddress]: false }));
    setPlcMessage(`Reset Counter ${selectedElement.rawAddress} แล้ว`);
  };

  const addresses = useMemo(() => {
    const found = new Set<string>(Object.keys(memory));
    rungs.forEach((rung) => rung.mainElements.forEach((element) => found.add(element.rawAddress)));
    return Array.from(found);
  }, [memory, rungs]);
  const selectedWidget = widgets.find((widget) => widget.id === selectedWidgetId);
  const selectedElement = selectedElementId
    ? rungs.find((rung) => rung.id === selectedElementId.rungId)?.mainElements.find((element) => element.id === selectedElementId.elementId)
    : undefined;
  const selectedElementRung = selectedElementId ? rungs.find((rung) => rung.id === selectedElementId.rungId) : undefined;
  const selectedOutputHasSealIn = Boolean(selectedElement && selectedElementRung?.branches?.some((branch) => branch.elements.some((element) => element.rawAddress === selectedElement.rawAddress)));
  const isWirePowered = (rung: ExtendedLadderRung, wireX: number) => {
    if (!isRunning || getRungWiringIssue(rung)) return false;
    const preceding = rung.mainElements
      .filter((element) => (element.x || 0) < wireX)
      .sort((a, b) => (a.x || 0) - (b.x || 0));
    const branchOn = Boolean(rung.branches?.some((branch) => branch.elements.every((element) => element.state)));
    return preceding.every((element, index) => index === 0 && rung.branches?.length ? Boolean(element.state) || branchOn : Boolean(element.state));
  };

  const markProgramDirty = () => {
    setIsRunning(false);
    setIsDownloaded(false);
    setPlcMode("PROGRAM");
    setPlcMessage("โปรแกรมมีการแก้ไข · กรุณา Verify และ Download ใหม่");
  };

  const addElement = (tool: Tool, rungId: string, x: number) => {
    markProgramDirty();
    const target = rungs.find((rung) => rung.id === rungId);
    if (!target) return;
    const sequence = target.mainElements.length + 1;
    const isOutput = ["COIL", "SET", "RSET", "DIFU", "DIFD"].includes(tool.type);
    const profile = activeBrand?.profile || brands[0].profile;
    const newElement = {
      id: `e-${Date.now()}`,
      type: tool.type,
      rawAddress: isOutput ? formatDeviceAddress(profile, "output", sequence) : tool.type === "TIM" ? formatDeviceAddress(profile, "timer", sequence) : tool.type === "CNT" ? formatDeviceAddress(profile, "counter", sequence) : formatDeviceAddress(profile, "input", sequence),
      label: tool.type,
      presetTime: tool.type === "TIM" ? 5 : undefined,
      presetCount: tool.type === "CNT" ? 10 : undefined,
      x,
    };
    setRungs((items) => items.map((rung) => rung.id === rungId ? { ...rung, mainElements: [...rung.mainElements, newElement].sort((a, b) => (a.x || 0) - (b.x || 0)) } : rung));
    setMemory((current) => ({ ...current, [newElement.rawAddress]: false }));
    setSelectedElementId({ rungId, elementId: newElement.id });
  };

  const setLadderDragData = (event: DragEvent<HTMLElement>, data: LadderDragData) => {
    const payload = JSON.stringify(data);
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData("application/x-plc-ladder", payload);
    event.dataTransfer.setData("text/plain", payload);
  };

  const handleRungDrop = (event: DragEvent<HTMLDivElement>, targetRungId: string) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-plc-ladder") || event.dataTransfer.getData("text/plain");
    if (!raw) return;
    const data = JSON.parse(raw) as LadderDragData;
    markProgramDirty();
    const bounds = event.currentTarget.getBoundingClientRect();
    const rawX = Math.max(0, Math.min(bounds.width - 84, event.clientX - bounds.left - 42));
    const dropX = Math.round(rawX / 84) * 84;
    setSelectedRung(targetRungId);
    setLadderCursorX(dropX + 84);

    if (data.kind === "new-element") {
      const tool = toolByType(data.type);
      if (tool) addElement(tool, targetRungId, dropX);
      return;
    }
    if (data.kind === "new-wire") {
      setRungs((items) => items.map((rung) => rung.id === targetRungId ? {
        ...rung,
        wires: [...(rung.wires || []), { id: `wire-${Date.now()}`, x: dropX, width: 84 }],
      } : rung));
      return;
    }
    if (data.kind === "new-vertical-wire") {
      setRungs((items) => items.map((rung) => rung.id === targetRungId ? {
        ...rung,
        wires: [...(rung.wires || []), { id: `wire-v-${Date.now()}`, x: dropX, width: 2, orientation: "vertical", y: 32, height: 64 }],
      } : rung));
      return;
    }
    if (data.kind === "element") {
      const source = rungs.find((rung) => rung.id === data.rungId)?.mainElements.find((element) => element.id === data.elementId);
      if (!source) return;
      setRungs((items) => items.map((rung) => {
        const withoutMoved = rung.mainElements.filter((element) => element.id !== data.elementId);
        return rung.id === targetRungId
          ? { ...rung, mainElements: [...withoutMoved, { ...source, x: dropX }].sort((a, b) => (a.x || 0) - (b.x || 0)) }
          : { ...rung, mainElements: withoutMoved };
      }));
      return;
    }
    const sourceWire = rungs.find((rung) => rung.id === data.rungId)?.wires?.find((wire) => wire.id === data.wireId);
    if (!sourceWire) return;
    setRungs((items) => items.map((rung) => {
      const withoutMoved = (rung.wires || []).filter((wire) => wire.id !== data.wireId);
      return rung.id === targetRungId
        ? { ...rung, wires: [...withoutMoved, { ...sourceWire, x: dropX }] }
        : { ...rung, wires: withoutMoved };
    }));
  };

  const addRung = () => {
    markProgramDirty();
    const id = `rung-${Date.now()}`;
    setRungs((items) => [...items, { id, mainElements: [] }]);
    setSelectedRung(id);
  };

  const removeRung = (rungId: string) => {
    markProgramDirty();
    const remaining = rungs.filter((rung) => rung.id !== rungId);
    if (remaining.length > 0) {
      setRungs(remaining);
      if (selectedRung === rungId) setSelectedRung(remaining[0].id);
    } else {
      const id = `rung-${Date.now()}`;
      setRungs([{ id, mainElements: [], wires: [] }]);
      setSelectedRung(id);
      setLadderCursorX(0);
    }
    if (selectedElementId?.rungId === rungId) setSelectedElementId(null);
  };

  const removeElement = (rungId: string, elementId: string) => {
    markProgramDirty();
    setRungs((items) => items.map((rung) => rung.id === rungId ? { ...rung, mainElements: rung.mainElements.filter((element) => element.id !== elementId) } : rung));
    if (selectedElementId?.elementId === elementId) setSelectedElementId(null);
  };

  const updateLadderElement = (changes: Partial<ExtendedLadderElement>) => {
    if (!selectedElementId || !selectedElement) return;
    markProgramDirty();
    const oldAddress = selectedElement.rawAddress;
    const newAddress = changes.rawAddress;
    setRungs((items) => items.map((rung) => rung.id === selectedElementId.rungId ? {
      ...rung,
      mainElements: rung.mainElements.map((element) => element.id === selectedElementId.elementId ? { ...element, ...changes } : element),
    } : rung));
    if (newAddress && newAddress !== oldAddress) {
      setMemory((current) => {
        const next = { ...current, [newAddress]: Boolean(current[oldAddress]) };
        delete next[oldAddress];
        return next;
      });
      setWidgets((items) => items.map((widget) => widget.address === oldAddress ? { ...widget, address: newAddress } : widget));
    }
    if (selectedElement.type === "TIM" && changes.currentTime === 0) {
      setMemory((current) => ({ ...current, [oldAddress]: false }));
    }
    if (selectedElement.type === "CNT" && changes.currentCount === 0) {
      setMemory((current) => ({ ...current, [oldAddress]: false }));
    }
  };

  const connectElementToHmi = () => {
    if (!selectedElement) return;
    const isInput = Boolean(activeBrand && selectedElement.rawAddress.startsWith(activeBrand.profile.input));
    const id = `w-${Date.now()}`;
    setWidgets((items) => [...items, {
      id,
      kind: isInput ? "button" : "lamp",
      address: selectedElement.rawAddress,
      label: selectedElement.label || selectedElement.rawAddress,
      x: 48 + (items.length % 4) * 42,
      y: 100 + (items.length % 4) * 34,
      width: isInput ? 170 : 150,
      height: isInput ? 120 : 140,
      color: isInput ? "#0e5d98" : "#ffc928",
    }]);
    setSelectedWidgetId(id);
    setMode("hmi");
  };

  const toggleSealInBranch = () => {
    if (!selectedElementId || !selectedElement || !selectedElementRung || !["COIL", "SET"].includes(selectedElement.type)) return;
    markProgramDirty();
    const firstContact = selectedElementRung.mainElements.find((element) => ["NO", "NC"].includes(element.type));
    if (!firstContact) {
      setPlcMessage("สร้าง Seal-in ไม่ได้ · ต้องมี Contact ก่อน Output Coil");
      return;
    }
    setRungs((items) => items.map((rung) => {
      if (rung.id !== selectedElementId.rungId) return rung;
      const matchingBranch = rung.branches?.find((branch) => branch.elements.some((element) => element.rawAddress === selectedElement.rawAddress));
      if (matchingBranch) return { ...rung, branches: (rung.branches || []).filter((branch) => branch.id !== matchingBranch.id) };
      return {
        ...rung,
        branches: [...(rung.branches || []), {
          id: `seal-${Date.now()}`,
          startX: 0,
          endX: (firstContact.x || 84) + 84,
          elements: [{ id: `seal-contact-${Date.now()}`, type: "NO", rawAddress: selectedElement.rawAddress, label: `${selectedElement.label || "OUTPUT"} HOLD`, x: firstContact.x || 84 }],
        }],
      };
    }));
    setPlcMessage(selectedOutputHasSealIn ? "นำวงจร Seal-in ออกแล้ว" : `สร้าง Seal-in ด้วย ${selectedElement.rawAddress} แล้ว · กรุณา Download ใหม่`);
  };

  const removeWire = (rungId: string, wireId: string) => {
    markProgramDirty();
    setRungs((items) => items.map((rung) => rung.id === rungId ? { ...rung, wires: (rung.wires || []).filter((wire) => wire.id !== wireId) } : rung));
  };

  const addWidget = (kind: HmiWidget["kind"]) => {
    const profile = activeBrand?.profile || brands[0].profile;
    const isControl = kind === "button" || kind === "switch";
    const address = kind === "label" ? undefined : isControl ? formatDeviceAddress(profile, "input", 0) : formatDeviceAddress(profile, "output", 0);
    const id = `w-${Date.now()}`;
    const offset = (widgets.length % 5) * 24;
    setWidgets((items) => [...items, {
      id,
      kind,
      address,
      label: kind.toUpperCase(),
      x: 40 + offset,
      y: 90 + offset,
      width: kind === "label" || kind === "alarm" ? 280 : kind === "tank" ? 130 : 160,
      height: kind === "label" ? 64 : kind === "tank" ? 190 : kind === "alarm" ? 74 : 125,
      color: kind === "lamp" || kind === "alarm" ? "#ffc928" : kind === "tank" ? "#24a4d8" : "#0e5d98",
    }]);
    setSelectedWidgetId(id);
  };

  const updateWidget = (id: string, changes: Partial<HmiWidget>) => {
    setWidgets((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));
  };

  const startWidgetDrag = (event: PointerEvent<HTMLButtonElement>, widget: HmiWidget) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedWidgetId(widget.id);
    const handle = event.currentTarget;
    const widgetBox = handle.parentElement as HTMLElement;
    const canvas = widgetBox.parentElement as HTMLElement;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = widget.x;
    const originY = widget.y;
    handle.setPointerCapture(event.pointerId);

    handle.onpointermove = (moveEvent) => {
      updateWidget(widget.id, {
        x: Math.min(Math.max(0, canvas.clientWidth - widget.width), Math.max(0, originX + moveEvent.clientX - startX)),
        y: Math.min(Math.max(0, canvas.clientHeight - widget.height), Math.max(0, originY + moveEvent.clientY - startY)),
      });
    };
    handle.onpointerup = () => {
      handle.onpointermove = null;
      handle.onpointerup = null;
    };
  };

  const startLadderSelection = (event: PointerEvent<HTMLDivElement>, rungId: string) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const area = event.currentTarget;
    const bounds = area.getBoundingClientRect();
    const startCell = Math.max(0, Math.floor((event.clientX - bounds.left) / 84) * 84);
    setSelectedRung(rungId);
    setSelectedElementId(null);
    setLadderSelection({ rungId, x: startCell, width: 84, height: 64 });
    area.setPointerCapture(event.pointerId);
    area.onpointermove = (moveEvent) => {
      const currentCell = Math.max(0, Math.floor((moveEvent.clientX - bounds.left) / 84) * 84);
      const x = Math.min(startCell, currentCell);
      const width = Math.abs(currentCell - startCell) + 84;
      const height = Math.max(64, Math.min(192, Math.ceil((moveEvent.clientY - bounds.top) / 64) * 64));
      setLadderSelection({ rungId, x, width, height });
    };
    area.onpointerup = () => {
      area.onpointermove = null;
      area.onpointerup = null;
    };
  };

  const guideBrand = brands.find((brand) => brand.id === guideBrandId) || brands[2];
  const guide = brandGuides[guideBrand.id];
  const guideModal = showGuide && <div className={styles.guideOverlay} onMouseDown={() => setShowGuide(false)}>
    <section className={styles.guideDialog} onMouseDown={(event) => event.stopPropagation()}>
      <header className={styles.guideHeader}>
        <div><span>PLC BRAND HANDBOOK</span><h2>คู่มือเริ่มต้นใช้งาน PLC</h2><p>เลือกยี่ห้อแล้วทำตามขั้นตอนตั้งแต่สร้าง Project จนถึงเชื่อม HMI</p></div>
        <button onClick={() => setShowGuide(false)} aria-label="ปิดคู่มือ">×</button>
      </header>
      <nav className={styles.guideBrandTabs}>
        {brands.map((brand) => <button key={brand.id} className={guideBrandId === brand.id ? styles.activeGuideBrand : ""} style={{ borderColor: guideBrandId === brand.id ? brand.color : undefined }} onClick={() => setGuideBrandId(brand.id)}><span style={{ color: brand.color }}>{brand.code}</span><b>{brand.name}</b></button>)}
      </nav>
      <div className={styles.guideBody}>
        <div className={styles.guideHero}>
          <img src="/guides/plc-hmi-workflow.png" alt="แผนภาพ Input, PLC Ladder และ HMI" />
          <div><span style={{ color: guideBrand.color }}>{guideBrand.code}</span><h3>{guideBrand.name}</h3><p>{guide.software}</p><small>{guide.connect}</small></div>
        </div>
        <div className={styles.guideColumns}>
          <section className={styles.guideSteps}><h4>4 ขั้นตอนเริ่มต้น</h4>{guide.steps.map((step, index) => <div key={step}><span>{index + 1}</span><p>{step}</p></div>)}</section>
          <section className={styles.guideExample}>
            <h4>ข้อมูลเฉพาะของ {guideBrand.name}</h4>
            <div className={styles.guideVendorFacts}>
              <span>PROGRAM UNIT<b>{guide.program}</b></span>
              <span>CONTACT<b>{guide.contact}</b></span>
              <span>COIL<b>{guide.coil}</b></span>
              <span>ONLINE / TRANSFER<b>{guide.online}</b></span>
            </div>
            <h4 className={styles.guideExampleTitle}>ตัวอย่าง Address และ Ladder</h4>
            <div className={styles.guideAddressRow}><span>INPUT<b>{guide.input}</b></span><span>OUTPUT<b>{guide.output}</b></span><span>TIMER<b>{guide.timer}</b></span></div>
            <div className={styles.guideLadder}><i /><span><small>{guide.input}</small><b>{guide.contact.split(" / ")[0]}</b><em>START</em></span><u /><span><small>{guide.output}</small><b>{guide.coil.split(" / ")[0]}</b><em>MOTOR</em></span><i /></div>
            <p className={styles.guideTip}><Icon.Bulb /> {guide.tip}</p>
          </section>
        </div>
        <div className={styles.guideActions}><span>ภาพรวม: Input → Scan Ladder → Output → HMI</span><button onClick={() => { selectBrand(guideBrand); setShowGuide(false); }}>เปิดโปรเจกต์ตัวอย่าง {guideBrand.name} →</button></div>
      </div>
    </section>
  </div>;

  if (!brandId) {
    return (
      <div className={styles.brandPage}>
        <Head><title>PLC Lab — เลือกยี่ห้อ PLC</title></Head>
        <header className={styles.brandHeader}>
          <div className={styles.logoMark}><Icon.Cpu /><span>PLC<span>LAB</span></span></div>
          <div className={styles.headerActions}><button onClick={() => setShowGuide(true)}><Icon.Book /> คู่มือเริ่มต้น</button><div className={styles.avatar}>ST</div></div>
        </header>
        {guideModal}
        <main className={styles.brandMain}>
          <div className={styles.eyebrow}><span /> PLC LEARNING STUDIO</div>
          <h1>เริ่มต้นสร้างโปรแกรม<br /><em>PLC ของคุณ</em></h1>
          <p className={styles.lead}>เลือกแพลตฟอร์มที่ต้องการเรียนรู้ เราจะปรับ Address และเครื่องมือ<br className={styles.desktopOnly} />ให้ใกล้เคียงกับซอฟต์แวร์จริงของแต่ละค่าย</p>
          <div className={styles.searchBox}><Icon.Cursor /><input value={brandQuery} onChange={(event) => setBrandQuery(event.target.value)} placeholder="ค้นหายี่ห้อหรือซอฟต์แวร์..." /></div>
          <section className={styles.brandGrid}>
            {filteredBrands.map((brand) => (
              <button key={brand.id} className={styles.brandCard} onClick={() => selectBrand(brand)}>
                <span className={styles.brandBadge} style={{ color: brand.color, borderColor: `${brand.color}33`, background: `${brand.color}0d` }}>{brand.code}</span>
                <span className={styles.brandInfo}><strong>{brand.name}</strong><small>{brand.software}</small></span>
                <span className={styles.cardArrow}>→</span>
              </button>
            ))}
          </section>
          <p className={styles.standardNote}><Icon.Signal /> รองรับมาตรฐาน IEC 61131-3 • เรียนได้โดยไม่ต้องต่อ PLC จริง</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`${styles.appShell} ${activeBrand ? styles[`brand${activeBrand.id}`] : ""}`}>
      <Head><title>{projectName} — PLC Lab</title></Head>
      <header className={styles.appHeader}>
        <div className={styles.appBrand}><button className={styles.iconButton} onClick={() => setBrandId(null)} aria-label="กลับไปเลือก PLC"><Icon.ArrowLeft /></button><div className={styles.logoMark}><Icon.Cpu /><span>PLC<span>LAB</span></span></div></div>
        <div className={styles.projectTitle}><input value={projectName} onChange={(event) => setProjectName(event.target.value)} /><span>บันทึกอัตโนมัติแล้ว</span></div>
        <div className={styles.appActions}>
          <div className={styles.selectedBrand}><span style={{ color: activeBrand?.color }}>{activeBrand?.code}</span><div><b>{activeBrand?.name}</b><small>{activeBrand?.software}</small></div><Icon.ChevronDown /></div>
          <button className={styles.iconButton} title="คัดลอกโปรเจกต์"><Icon.Duplicate /></button>
          <span className={`${styles.plcModeBadge} ${styles[`mode${plcMode}`]}`}>{plcMode}</span>
          <button className={styles.downloadButton} onClick={downloadProgram}>↓ DOWNLOAD</button>
          <button className={styles.runButton} disabled={isRunning} onClick={startPlc}><Icon.Play /> RUN</button>
          <button className={styles.stopButton} disabled={!isRunning} onClick={stopPlc}><Icon.Stop /> STOP</button>
        </div>
      </header>

      <nav className={styles.modeNav}>
        <button className={mode === "ladder" ? styles.activeMode : ""} onClick={() => setMode("ladder")}><Icon.Ladder /> Ladder Logic <span>LD</span></button>
        <button className={mode === "hmi" ? styles.activeMode : ""} onClick={() => setMode("hmi")}><Icon.Design /> HMI Design <span>DESIGN</span></button>
        <button className={styles.lessonNavButton} onClick={() => setShowLessons(true)}><Icon.Book /> บทเรียน <span>1–10</span></button>
        <button className={styles.guideNavButton} onClick={() => { if (activeBrand) setGuideBrandId(activeBrand.id); setShowGuide(true); }}><Icon.Book /> คู่มือยี่ห้อ</button>
        <div className={styles.statusLine}><i className={isRunning ? styles.online : ""} /> CPU {plcMode} · SCAN {scanCount} · {scanTimeMs.toFixed(2)} ms</div>
      </nav>

      {guideModal}

      {showLessons && <div className={styles.lessonOverlay} onMouseDown={() => setShowLessons(false)}>
        <section className={styles.lessonDialog} onMouseDown={(event) => event.stopPropagation()}>
          <header className={styles.lessonHeader}>
            <div><span>PLC LEARNING PATH</span><h2>บทเรียน Ladder Logic 1–10</h2><p>เลือกบทเรียนเพื่อโหลดวงจรตัวอย่างและ HMI ที่เชื่อมต่อพร้อมทดลอง</p></div>
            <button onClick={() => setShowLessons(false)} aria-label="ปิดบทเรียน">×</button>
          </header>
          <div className={styles.lessonGrid}>
            {lessons.map((lesson) => <button key={lesson.id} className={`${styles.lessonCard} ${activeLessonId === lesson.id ? styles.activeLesson : ""}`} onClick={() => loadLesson(lesson)}>
              <span className={styles.lessonNumber}>{String(lesson.id).padStart(2, "0")}</span>
              <span className={styles.lessonContent}><small>{lesson.level} · ตัวอย่างพร้อมทดลอง</small><b>{lesson.title}</b><em>{lesson.subtitle}</em><p>{lesson.objective}</p></span>
              <span className={styles.lessonLoad}>โหลดบทเรียน <b>→</b></span>
            </button>)}
          </div>
        </section>
      </div>}

      {mode === "ladder" ? (
        <main className={styles.workspace}>
          <aside className={styles.toolbox}>
            <div className={styles.panelHeading}><span>INSTRUCTIONS</span><small>ลากไปวาง</small></div>
            <div className={styles.toolList}>
              {tools.map((tool) => <button key={tool.type} className={["COIL", "SET", "RSET"].includes(tool.type) ? styles.coilTool : ""} draggable onDragStart={(event) => setLadderDragData(event, { kind: "new-element", type: tool.type })}><code>{getInstructionSymbol(tool)}</code><span><b>{tool.title}</b><small>{tool.hint}</small></span></button>)}
              <button className={styles.wireTool} draggable onDragStart={(event) => setLadderDragData(event, { kind: "new-wire" })}><code><Icon.Wire /></code><span><b>Wire</b><small>เส้นเชื่อมวงจร</small></span></button>
              <button className={styles.verticalWireTool} draggable onDragStart={(event) => setLadderDragData(event, { kind: "new-vertical-wire" })}><code>│</code><span><b>Vertical Wire</b><small>สายเชื่อมลงด้านล่าง</small></span></button>
            </div>
            <div className={styles.tip}><Icon.Bulb /><span><b>ลากแล้ววาง</b>ลาก Instruction หรือ Wire ไปวางใน Rung และลากซ้ำเพื่อย้ายตำแหน่ง</span></div>
          </aside>

          <section className={styles.editorArea}>
            <div className={styles.editorToolbar}><div className={styles.cpuMessage}><b>Main Program</b><span> / {plcMessage}</span></div><div><button onClick={verifyProgram}>✓ Verify</button><button onClick={singleScan}>↦ Single Scan</button><button onClick={resetCpu}><Icon.Refresh /> Reset CPU</button></div></div>
            <div className={`${styles.ladderCanvas} ${activeBrand?.id === "OMRON" ? styles.omronCanvas : ""}`}>
              <div className={styles.programStrip}>
                <span className={styles.programIndex}>0</span>
                <div><b>{activeIdentity.primary.replace("{project}", projectName || "NewProgram1")}</b><b>{activeIdentity.secondary}</b></div>
              </div>
              <div className={styles.railLabels}><span>L+</span><span>N</span></div>
              {rungs.map((rung, rungIndex) => (
                <div key={rung.id} className={`${styles.rung} ${rung.branches?.length ? styles.hasBranch : ""} ${rung.mainElements.some((element) => ["TIM", "CNT"].includes(element.type)) ? styles.hasTimingElement : ""} ${selectedRung === rung.id ? styles.selectedRung : ""} ${getRungWiringIssue(rung) ? styles.wiringFault : ""}`} onClick={() => { setSelectedRung(rung.id); setSelectedElementId(null); }}>
                  <span className={styles.rungNumber}>{String(rungIndex + 1).padStart(2, "0")}</span>
                  {getRungWiringIssue(rung) && <span className={styles.wiringWarning}>⚠ สายไฟไม่ต่อเนื่อง: {getRungWiringIssue(rung)}</span>}
                  <button className={styles.deleteRung} onClick={(event) => { event.stopPropagation(); removeRung(rung.id); }} title="ลบ Rung" aria-label={`ลบ Rung ${rungIndex + 1}`}><Icon.Trash /></button>
                  <div className={styles.rungWire} onPointerDown={(event) => startLadderSelection(event, rung.id)} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => handleRungDrop(event, rung.id)}>
                    {ladderSelection?.rungId === rung.id && !selectedElementId && <span className={styles.ladderSelection} style={{ left: ladderSelection.x, width: ladderSelection.width, height: ladderSelection.height }}><i /></span>}
                    {rung.branches?.map((branch) => <div key={branch.id} className={`${styles.ladderBranch} ${isRunning && branch.elements.every((element) => element.state) ? styles.branchPowered : ""}`} style={{ left: branch.startX || 0, width: (branch.endX || 168) - (branch.startX || 0) }}>
                      <i />
                      {branch.elements.map((element) => <span key={element.id} className={styles.branchElement} style={{ left: (element.x || 84) - (branch.startX || 0) }}><small>{element.rawAddress}</small><code>{getInstructionSymbol(toolByType(element.type)) || element.type}</code><em>{element.label}</em></span>)}
                    </div>)}
                    {(rung.wires || []).map((wire) => {
                      if (wire.orientation === "vertical") return <div key={wire.id} className={`${styles.verticalWireSegment} ${isWirePowered(rung, wire.x) ? styles.poweredVerticalWire : ""}`} style={{ left: wire.x, top: wire.y || 32, height: wire.height || 64 }} draggable onDragStart={(event) => setLadderDragData(event, { kind: "wire", rungId: rung.id, wireId: wire.id })}><i /><button onClick={(event) => { event.stopPropagation(); removeWire(rung.id, wire.id); }} aria-label="ลบสายแนวตั้ง">×</button></div>;
                      const stretchesToOutput = rung.mainElements.some((element) => ["COIL", "SET", "RSET", "DIFU", "DIFD"].includes(element.type) && wire.x < (element.x || 0) && wire.x + wire.width >= (element.x || 0) - 4);
                      return <div key={wire.id} className={`${styles.ladderWireSegment} ${stretchesToOutput ? styles.stretchWire : ""} ${isWirePowered(rung, wire.x) ? styles.poweredWire : ""}`} style={{ left: wire.x, width: wire.width }} draggable onDragStart={(event) => setLadderDragData(event, { kind: "wire", rungId: rung.id, wireId: wire.id })}>
                      <i />
                      <button onClick={(event) => { event.stopPropagation(); removeWire(rung.id, wire.id); }} aria-label="ลบเส้น">×</button>
                    </div>;})}
                    {rung.mainElements.map((element) => {
                      const definition = toolByType(element.type);
                      const isInputElement = Boolean(activeBrand && element.rawAddress.startsWith(activeBrand.profile.input) && ["NO", "NC"].includes(element.type));
                      const inputIsOn = Boolean(memory[element.rawAddress]);
                      const isOutputElement = ["COIL", "SET", "RSET", "DIFU", "DIFD"].includes(element.type);
                      return <div key={element.id} draggable title={isInputElement ? `คลิกเพื่อสลับ Input ${element.rawAddress}` : undefined} onClick={(event) => { event.stopPropagation(); setSelectedRung(rung.id); setSelectedElementId({ rungId: rung.id, elementId: element.id }); if (isRunning && isInputElement) toggleInputAddress(element.rawAddress); }} onDragStart={(event) => setLadderDragData(event, { kind: "element", rungId: rung.id, elementId: element.id })} style={{ left: element.x || 0 }} className={`${styles.ladderElement} ${isOutputElement ? styles.outputElement : ""} ${element.type === "TIM" ? styles.timerElement : ""} ${element.type === "CNT" ? styles.counterElement : ""} ${element.state ? styles.energized : ""} ${selectedElementId?.elementId === element.id ? styles.selectedElement : ""} ${isRunning && isInputElement ? styles.clickableInput : ""} ${inputIsOn && isInputElement ? styles.inputForcedOn : ""}`}>
                        <span className={styles.address}>{element.rawAddress}</span>
                        <code>{getInstructionSymbol(definition) || element.type}</code>
                        <span className={styles.elementLabel}>{element.label}</span>
                        {element.type === "TIM" && <span className={`${styles.timerCountdown} ${(element.currentTime || 0) >= (element.presetTime || 5) ? styles.timerDone : ""}`}><b>{Math.max(0, (element.presetTime || 5) - (element.currentTime || 0)).toFixed(1)}</b>s</span>}
                        {element.type === "CNT" && <span className={`${styles.counterValue} ${element.state ? styles.counterDone : ""}`}><b>{element.currentCount || 0}</b>/{element.presetCount || 10}</span>}
                        {isInputElement && <em className={styles.inputState}>{inputIsOn ? "ON" : "OFF"}</em>}
                        <button onClick={(event) => { event.stopPropagation(); removeElement(rung.id, element.id); }} aria-label="ลบ"><Icon.Trash /></button>
                      </div>;
                    })}
                  </div>
                </div>
              ))}
              <button className={styles.addRung} onClick={addRung}><Icon.Plus /> เพิ่ม Rung</button>
            </div>
          </section>

          <aside className={styles.monitorPanel}>
            {selectedElement && <div className={styles.ladderProperties}>
              <div className={styles.panelHeading}><span>PROPERTIES</span><Icon.Adjust /></div>
              <div className={styles.propertyForm}>
                <div className={styles.objectType}><span>{selectedElement.type.slice(0, 1)}</span><div><b>{selectedElement.type}</b><small>Ladder instruction</small></div></div>
                <label>Instruction<select value={selectedElement.type} onChange={(event) => updateLadderElement({ type: event.target.value as ExtendedElementType })}>{tools.map((tool) => <option key={tool.type} value={tool.type}>{tool.title}</option>)}</select></label>
                <label>ชื่ออุปกรณ์<input value={selectedElement.label || ""} onChange={(event) => updateLadderElement({ label: event.target.value })} /></label>
                <label>PLC Address<input value={selectedElement.rawAddress} onChange={(event) => updateLadderElement({ rawAddress: event.target.value })} /></label>
                {activeBrand && selectedElement.rawAddress.startsWith(activeBrand.profile.input) && ["NO", "NC"].includes(selectedElement.type) && <button className={`${styles.forceInputButton} ${memory[selectedElement.rawAddress] ? styles.forceOn : ""}`} onClick={() => toggleInputAddress(selectedElement.rawAddress)}><span /> FORCE INPUT {memory[selectedElement.rawAddress] ? "ON" : "OFF"}</button>}
                {selectedElement.type === "TIM" && <div className={styles.timerSettings}>
                  <label>เวลาหน่วง (วินาที)<input type="number" min="0.1" step="0.1" value={selectedElement.presetTime || 5} onChange={(event) => updateLadderElement({ presetTime: Number(event.target.value), currentTime: 0, state: false })} /></label>
                  <div className={styles.timerMonitor}><span><small>เวลาคงเหลือ</small><b>{Math.max(0, (selectedElement.presetTime || 5) - (selectedElement.currentTime || 0)).toFixed(1)} s</b></span><em>{selectedElement.state ? "DONE" : (selectedElement.currentTime || 0) > 0 ? "TIMING" : "READY"}</em></div>
                  <div className={styles.timerProgress}><i style={{ width: `${Math.min(100, ((selectedElement.currentTime || 0) / (selectedElement.presetTime || 5)) * 100)}%` }} /></div>
                  <button onClick={resetSelectedTimer}><Icon.Refresh /> Reset Timer</button>
                </div>}
                {selectedElement.type === "CNT" && <div className={styles.timerSettings}>
                  <label>จำนวนพัลส์ที่กำหนด<input type="number" min="1" value={selectedElement.presetCount || 10} onChange={(event) => updateLadderElement({ presetCount: Number(event.target.value), currentCount: 0, lastRungPower: false, state: false })} /></label>
                  <div className={styles.timerMonitor}><span><small>จำนวนปัจจุบัน</small><b>{selectedElement.currentCount || 0} / {selectedElement.presetCount || 10}</b></span><em>{selectedElement.state ? "DONE" : "COUNTING"}</em></div>
                  <div className={styles.timerProgress}><i style={{ width: `${Math.min(100, ((selectedElement.currentCount || 0) / (selectedElement.presetCount || 10)) * 100)}%` }} /></div>
                  <button onClick={resetSelectedCounter}><Icon.Refresh /> Reset Counter</button>
                </div>}
                {["COIL", "SET"].includes(selectedElement.type) && <button className={`${styles.sealInButton} ${selectedOutputHasSealIn ? styles.sealInActive : ""}`} onClick={toggleSealInBranch}><Icon.Bolt /> {selectedOutputHasSealIn ? "Seal-in ทำงานอยู่ · กดเพื่อนำออก" : "สร้างวงจรค้างสถานะ Seal-in"}</button>}
                <div className={styles.hmiLinkStatus}><Icon.Signal /><span><b>{widgets.filter((widget) => widget.address === selectedElement.rawAddress).length} HMI objects</b><small>เชื่อมด้วย {selectedElement.rawAddress}</small></span></div>
                <button className={styles.connectHmiButton} onClick={connectElementToHmi}><Icon.Design /> เชื่อมต่อและเปิด HMI</button>
              </div>
            </div>}
            <div className={styles.panelHeading}><span>LIVE I/O</span><small>{isRunning ? "ออนไลน์" : "ทดสอบอินพุต"}</small></div>
            <p>กดสวิตช์ Input เพื่อดู Power flow ในวงจร</p>
            <div className={styles.ioList}>{addresses.map((address) => {
              const isInput = Boolean(activeBrand && address.startsWith(activeBrand.profile.input));
              const enabled = Boolean(memory[address]);
              return <button key={address} className={enabled ? styles.ioOn : ""} disabled={!isInput} onClick={() => setMemory((current) => ({ ...current, [address]: !current[address] }))}><span className={styles.ioDot} /><span><b>{address}</b><small>{isInput ? "Digital input" : "Digital output"}</small></span><em>{enabled ? "ON" : "OFF"}</em></button>;
            })}</div>
          </aside>
        </main>
      ) : (
        <main className={styles.hmiWorkspace}>
          <aside className={styles.hmiTools}>
            <div className={styles.panelHeading}><span>HMI OBJECTS</span><small>คลิกเพื่อวาง</small></div>
            <div className={styles.widgetGrid}>
              <button onClick={() => addWidget("button")}><span className={styles.miniButton}>START</span><b>Push button</b></button>
              <button onClick={() => addWidget("switch")}><span className={styles.miniSwitch}><i /></span><b>Selector switch</b></button>
              <button onClick={() => addWidget("lamp")}><span className={styles.miniLamp} /><b>Indicator</b></button>
              <button onClick={() => addWidget("gauge")}><span className={styles.miniGauge}>72%</span><b>Gauge</b></button>
              <button onClick={() => addWidget("numeric")}><span className={styles.miniNumeric}>128</span><b>Numeric display</b></button>
              <button onClick={() => addWidget("tank")}><span className={styles.miniTank}><i /></span><b>Tank level</b></button>
              <button onClick={() => addWidget("alarm")}><span className={styles.miniAlarm}>!</span><b>Alarm banner</b></button>
              <button onClick={() => addWidget("label")}><span className={styles.miniText}>Aa</span><b>Text</b></button>
            </div>
            <div className={styles.tip}><Icon.Bolt /><span><b>เชื่อมต่อทันที</b>วัตถุ HMI ใช้ Address ชุดเดียวกับ Ladder Logic</span></div>
          </aside>
          <section className={styles.hmiEditor}>
            <div className={styles.editorToolbar}><div><b>Screen_1</b><span> / 1280 × 800 px</span></div><div><span className={styles.zoom}>100%</span></div></div>
            <div className={styles.screenFrame}>
              <div className={styles.screenTop}><div><Icon.Cpu /> LINE 01</div><span>{isRunning ? "PLC CONNECTED" : "PLC OFFLINE"}</span></div>
              <div className={styles.screenGrid} onClick={() => setSelectedWidgetId(null)}>
                {widgets.map((widget) => {
                  const on = widget.address ? Boolean(memory[widget.address]) : false;
                  return (
                    <div
                      key={widget.id}
                      className={`${styles.draggableWidget} ${selectedWidgetId === widget.id ? styles.selectedWidget : ""}`}
                      style={{ left: widget.x, top: widget.y, width: widget.width, height: widget.height }}
                      onClick={(event) => { event.stopPropagation(); setSelectedWidgetId(widget.id); }}
                    >
                      <button className={styles.dragHandle} onPointerDown={(event) => startWidgetDrag(event, widget)} title="ลากเพื่อย้ายตำแหน่ง">⠿</button>
                      {widget.kind === "label" && <div className={styles.hmiLabel} style={{ color: widget.color }}>{widget.label}</div>}
                      {widget.kind === "switch" && <button className={styles.hmiSwitch} onClick={() => widget.address && setMemory((current) => ({ ...current, [widget.address!]: !current[widget.address!] }))}><span className={on ? styles.switchOn : ""} style={on ? { backgroundColor: widget.color } : undefined}><i /></span><b>{widget.label}</b><small>{widget.address}</small></button>}
                      {widget.kind === "lamp" && <div className={styles.hmiWidget}><span className={`${styles.bigLamp} ${on ? styles.bigLampOn : ""}`} style={on ? { backgroundColor: widget.color } : undefined} /><b>{widget.label}</b><small>{widget.address}</small></div>}
                      {widget.kind === "gauge" && <div className={styles.hmiWidget}><div className={styles.gauge} style={{ borderColor: widget.color }}><span>{on ? "100" : "0"}%</span></div><b>{widget.label}</b><small>{widget.address}</small></div>}
                      {widget.kind === "numeric" && <div className={styles.hmiNumeric}><span style={{ color: widget.color }}>{on ? "100.0" : "0.0"}</span><b>{widget.label}</b><small>{widget.address}</small></div>}
                      {widget.kind === "tank" && <div className={styles.hmiTank}><div className={styles.tankBody}><i style={{ height: on ? "78%" : "18%", backgroundColor: widget.color }} /><em>{on ? "78" : "18"}%</em></div><b>{widget.label}</b><small>{widget.address}</small></div>}
                      {widget.kind === "alarm" && <div className={`${styles.hmiAlarm} ${on ? styles.alarmOn : ""}`} style={on ? { borderColor: widget.color } : undefined}><strong style={on ? { backgroundColor: widget.color } : undefined}>!</strong><span><b>{widget.label}</b><small>{on ? "ACTIVE" : "NORMAL"} · {widget.address}</small></span></div>}
                      {widget.kind === "button" && <button className={`${styles.hmiPush} ${on ? styles.hmiPushOn : ""}`} onClick={() => widget.address && setMemory((current) => ({ ...current, [widget.address!]: !current[widget.address!] }))}><span style={{ backgroundColor: widget.color }}>{widget.label}</span><small>{widget.address}</small></button>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <aside className={styles.propertyPanel}>
            <div className={styles.panelHeading}><span>PROPERTIES</span><Icon.Adjust /></div>
            {selectedWidget ? (
              <div className={styles.propertyForm}>
                <div className={styles.objectType}><span>{selectedWidget.kind.slice(0, 1).toUpperCase()}</span><div><b>{selectedWidget.kind}</b><small>HMI object</small></div></div>
                <label>ข้อความ<input value={selectedWidget.label} onChange={(event) => updateWidget(selectedWidget.id, { label: event.target.value })} /></label>
                {selectedWidget.kind !== "label" && <label>PLC Address<select value={selectedWidget.address || ""} onChange={(event) => updateWidget(selectedWidget.id, { address: event.target.value })}>{addresses.map((address) => <option key={address} value={address}>{address}</option>)}</select></label>}
                <label>สี<div className={styles.colorField}><input type="color" value={selectedWidget.color} onChange={(event) => updateWidget(selectedWidget.id, { color: event.target.value })} /><code>{selectedWidget.color.toUpperCase()}</code></div></label>
                <div className={styles.sizeFields}>
                  <label>กว้าง<input type="number" min="80" max="500" value={selectedWidget.width} onChange={(event) => updateWidget(selectedWidget.id, { width: Number(event.target.value) })} /></label>
                  <label>สูง<input type="number" min="48" max="300" value={selectedWidget.height} onChange={(event) => updateWidget(selectedWidget.id, { height: Number(event.target.value) })} /></label>
                </div>
                <div className={styles.positionReadout}><span>X <b>{Math.round(selectedWidget.x)}</b></span><span>Y <b>{Math.round(selectedWidget.y)}</b></span></div>
                <button className={styles.deleteWidget} onClick={() => { setWidgets((items) => items.filter((item) => item.id !== selectedWidget.id)); setSelectedWidgetId(null); }}><Icon.Trash /> ลบวัตถุ</button>
              </div>
            ) : <div className={styles.noSelection}><Icon.Cursor /><b>เลือกวัตถุบนหน้าจอ</b><span>คลิก Box เพื่อดูและแก้ไขการตั้งค่า</span></div>}
          </aside>
        </main>
      )}
    </div>
  );
}
