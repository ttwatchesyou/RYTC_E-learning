// src/pages/Linuxsim/index.tsx
import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import styled, { keyframes, createGlobalStyle } from "styled-components";
import { Button, Tag, Tooltip, Input, Badge, Card } from "antd";
import {
  PoweroffOutlined,
  CodeOutlined,
  FolderOutlined,
  WifiOutlined,
  SoundOutlined,
  CloseOutlined,
  MinusOutlined,
  BorderOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  BookOutlined,
  CheckCircleFilled,
  TrophyOutlined,
  SaveOutlined,
} from "@ant-design/icons";

// ---------------------------------------------------------
// 🌍 GLOBAL STYLES (ลบขอบขาวรอบจอ 100%)
// ---------------------------------------------------------
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
// 🎭 ANIMATIONS & STYLED COMPONENTS
// ---------------------------------------------------------

const spin = keyframes` 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } `;

// แทนที่ MainLayout ด้วย FullScreenPage ที่กางเต็มจอ
const FullScreenPage = styled.div`
  min-height: 100vh;
  background-color: #09090b; /* พื้นหลังสีดำเข้มแบบขอบจอมอนิเตอร์ */
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
`;

const Container = styled.div`
  width: 100%;
  max-width: 1600px;
  display: flex;
  flex-direction: column;
  font-family: "Prompt", sans-serif;
`;

const MonitorFrame = styled.div`
  background: #18181b;
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  border: 2px solid #27272a;
`;

const ComputerBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px 12px 12px;
  color: #a1a1aa;
  font-size: 0.85rem;
  font-weight: 600;
`;

const PowerLed = styled.div<{ $status: string }>`
  width: 10px; height: 10px; border-radius: 50%;
  background: ${(props) => props.$status === "on" ? "#22c55e" : props.$status === "boot" ? "#eab308" : "#ef4444"};
  box-shadow: 0 0 10px ${(props) => props.$status === "on" ? "#22c55e" : props.$status === "boot" ? "#eab308" : "#ef4444"};
`;

const ScreenDisplay = styled.div<{ $powerState: string }>`
  width: 100%; height: clamp(620px, 84vh, 900px);
  border-radius: 16px; overflow: hidden; position: relative;
  background: ${(props) => props.$powerState === "on" ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)" : "#000"};
`;

const Overlay = styled.div`
  width: 100%; height: 100%; background: #000;
  display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff;
`;

// 🌀 สปินเนอร์ตอน Boot เครื่อง
const BootSpinner = styled.div`
  margin-top: 24px;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: ${spin} 1s infinite linear;
`;

const TopPanel = styled.div`
  height: 30px; background: rgba(9, 9, 11, 0.88); color: #fff;
  display: flex; justify-content: space-between; align-items: center; padding: 0 14px;
  font-size: 0.85rem; font-weight: 600; z-index: 100;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const DesktopMainArea = styled.div` flex: 1; display: flex; position: relative; overflow: hidden; `;

const LeftDock = styled.div`
  width: 62px; background: rgba(9, 9, 11, 0.65); backdrop-filter: blur(10px);
  display: flex; flex-direction: column; align-items: center; padding: 14px 0; gap: 16px; z-index: 50;
  border-right: 1px solid rgba(255, 255, 255, 0.08);

  .dock-icon {
    width: 42px; height: 42px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff;
    cursor: pointer; transition: 0.2s; position: relative;
    &:hover { background: rgba(255, 255, 255, 0.15); transform: scale(1.1); }
    &.active::after { content: ""; position: absolute; left: -2px; width: 4px; height: 18px; background: #38bdf8; border-radius: 4px; }
  }
`;

const Workspace = styled.div`
  flex: 1; padding: 24px; display: flex; flex-direction: column; flex-wrap: wrap; align-content: flex-start; gap: 24px; position: relative; overflow: hidden;
`;

const DesktopIcon = styled.div`
  width: 84px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; padding: 8px; border-radius: 10px;
  &:hover { background: rgba(255, 255, 255, 0.15); }
  .icon-box { font-size: 42px; &.folder { color: #38bdf8; } &.file { color: #e2e8f0; } }
  .label { color: #fff; font-size: 0.8rem; text-align: center; word-break: break-all; text-shadow: 0 1px 3px #000; font-weight: 600; }
`;

// 🪟 WINDOW COMPONENTS (DRAG & RESIZE MULTI-DIRECTION)
const WindowContainer = styled.div<{ $x: number; $y: number; $w: number; $h: number; $zIndex: number; $isMinimized: boolean }>`
  position: absolute;
  top: ${(props) => props.$y}px; left: ${(props) => props.$x}px;
  width: ${(props) => props.$w}px; height: ${(props) => props.$h}px;
  background: #18181b; border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: ${(props) => (props.$isMinimized ? "none" : "flex")};
  flex-direction: column; overflow: hidden; z-index: ${(props) => props.$zIndex};
`;

const WindowTitleBar = styled.div`
  background: #09090b; padding: 8px 14px;
  display: flex; justify-content: space-between; align-items: center;
  color: #fff; font-size: 0.85rem; font-weight: 700; cursor: move; user-select: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .controls {
    display: flex; gap: 8px;
    .btn {
      width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; cursor: pointer; color: transparent; transition: 0.2s;
      &:hover { color: rgba(0,0,0,0.6); }
      &.close { background: #ef4444; } &.min { background: #eab308; } &.max { background: #22c55e; }
    }
  }
`;

// 📐 RESIZE HANDLES
const ResizeEdgeRight = styled.div`
  position: absolute; top: 0; right: 0; width: 8px; height: 100%; cursor: ew-resize; z-index: 90;
`;
const ResizeEdgeBottom = styled.div`
  position: absolute; bottom: 0; left: 0; width: 100%; height: 8px; cursor: ns-resize; z-index: 90;
`;
const ResizeCornerBottomRight = styled.div`
  position: absolute; bottom: 0; right: 0; width: 16px; height: 16px; cursor: nwse-resize; z-index: 100;
  &::after { content: ""; position: absolute; right: 4px; bottom: 4px; width: 8px; height: 8px; border-right: 2px solid #a1a1aa; border-bottom: 2px solid #a1a1aa; }
`;

// TERMINAL STYLES
const TerminalContent = styled.div`
  padding: 16px; flex: 1; overflow-y: auto; background: #09090b; color: #fff; font-family: "Fira Code", monospace; font-size: 0.95rem; line-height: 1.5;
  &::-webkit-scrollbar { width: 8px; } &::-webkit-scrollbar-thumb { background: #38bdf8; border-radius: 4px; }
`;

const PromptLabel = styled.span`
  color: #4ade80; font-weight: 700;
  span.host { color: #38bdf8; } span.path { color: #facc15; } span.sym { color: #fff; }
`;

const InputRow = styled.div` display: flex; align-items: center; gap: 8px; `;

const OutputLine = styled.div`
  margin-bottom: 6px; white-space: pre-wrap; word-break: break-all;
  &.error { color: #f87171; } &.success { color: #4ade80; } &.system { color: #facc15; } &.info { color: #38bdf8; }
`;

const TermInput = styled.input`
  background: transparent; border: none; outline: none; color: #fff; font-family: inherit; font-size: inherit; flex: 1; caret-color: #38bdf8;
`;

// ---------------------------------------------------------
// ⚙️ LOGIC & STATE INTERFACES
// ---------------------------------------------------------

interface VFSItem {
  id: string; name: string; type: "folder" | "file"; content?: string; path: string; perm: string;
}

interface WindowState {
  id: string; title: string; type: "terminal" | "files" | "editor" | "academy";
  x: number; y: number; w: number; h: number; zIndex: number; isMinimized: boolean;
}

interface HistoryItem {
  type: "cmd" | "out"; command?: string; text?: React.ReactNode; dirPath?: string; styleClass?: string;
}

interface Mission {
  id: number; category: string; title: string; desc: string; cmdTarget: string; exp: number; completed: boolean;
}

export default function ComprehensiveLinuxSimulator() {
  const [powerState, setPowerState] = useState<"on" | "off" | "boot">("on");
  const [clock, setClock] = useState<string>("");

  // Virtual File System
  const [vfs, setVfs] = useState<VFSItem[]>([
    { id: "bin", name: "bin", type: "folder", path: "/", perm: "drwxr-xr-x" },
    { id: "etc", name: "etc", type: "folder", path: "/", perm: "drwxr-xr-x" },
    { id: "home", name: "home", type: "folder", path: "/", perm: "drwxr-xr-x" },
    { id: "student", name: "student", type: "folder", path: "/home", perm: "drwxr-xr-x" },
    { id: "desktop", name: "Desktop", type: "folder", path: "/home/student", perm: "drwxr-xr-x" },
    { id: "docs", name: "Documents", type: "folder", path: "/home/student", perm: "drwxr-xr-x" },
    { id: "f1", name: "robot_lab", type: "folder", path: "/home/student/Desktop", perm: "drwxr-xr-x" },
    { id: "f2", name: "welcome.txt", type: "file", content: "Welcome to MECHARAYONG LINUX OS 2026 Academy!", path: "/home/student/Desktop", perm: "-rw-r--r--" },
  ]);

  const [currentPath, setCurrentPath] = useState<string>("/home/student");

  // Window Management
  const [windows, setWindows] = useState<WindowState[]>([
    { id: "term_1", title: "student@mecharayong-os: ~", type: "terminal", x: 50, y: 40, w: 680, h: 440, zIndex: 10, isMinimized: false },
    { id: "academy_1", title: "Mecha-Academy E-Learning", type: "academy", x: 220, y: 80, w: 720, h: 480, zIndex: 11, isMinimized: false },
  ]);
  const [topZIndex, setTopZIndex] = useState<number>(11);

  // Dragging & Resizing State
  const [draggingWinId, setDraggingWinId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ winId: string; dir: "r" | "b" | "br"; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Terminal & Editor
  const [history, setHistory] = useState<HistoryItem[]>([{ type: "out", text: "Welcome to MECHARAYONG LINUX OS 2026\nType 'help' for support or complete missions in 'Mecha-Academy'.\n" }]);
  const [inputVal, setInputVal] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  // 🎓 EXTENDED E-LEARNING CURRICULUM
  const [missions, setMissions] = useState<Mission[]>([
    { id: 1, category: "Level 1: Basic Navigation", title: "1.1 ตรวจสอบตำแหน่งโฟลเดอร์", desc: "ใช้คำสั่ง pwd เพื่อดูไดเรกทอรีปัจจุบัน", cmdTarget: "pwd", exp: 10, completed: false },
    { id: 2, category: "Level 1: Basic Navigation", title: "1.2 สำรวจไฟล์ทั้งหมด", desc: "ใช้คำสั่ง ls เพื่อลิสต์รายชื่อไฟล์", cmdTarget: "ls", exp: 10, completed: false },
    { id: 3, category: "Level 1: Basic Navigation", title: "1.3 ย้ายไปยัง Desktop", desc: "ใช้คำสั่ง cd Desktop", cmdTarget: "cd desktop", exp: 15, completed: false },
    { id: 4, category: "Level 1: Basic Navigation", title: "1.4 ถอยกลับไดเรกทอรีแม่", desc: "ใช้คำสั่ง cd .. เพื่อย้ายออก", cmdTarget: "cd ..", exp: 15, completed: false },
    { id: 5, category: "Level 2: File Operations", title: "2.1 สร้างโฟลเดอร์ใหม่", desc: "ใช้คำสั่ง mkdir my_project", cmdTarget: "mkdir my_project", exp: 20, completed: false },
    { id: 6, category: "Level 2: File Operations", title: "2.2 สร้างไฟล์เปล่า", desc: "ใช้คำสั่ง touch config.txt", cmdTarget: "touch config.txt", exp: 20, completed: false },
    { id: 7, category: "Level 2: File Operations", title: "2.3 เขียนข้อความลงไฟล์", desc: "ใช้คำสั่ง echo \"Hello World\" > note.txt", cmdTarget: "echo hello world > note.txt", exp: 25, completed: false },
    { id: 8, category: "Level 2: File Operations", title: "2.4 อ่านข้อความในไฟล์", desc: "ใช้คำสั่ง cat note.txt", cmdTarget: "cat note.txt", exp: 20, completed: false },
    { id: 9, category: "Level 2: File Operations", title: "2.5 ลบไฟล์", desc: "ใช้คำสั่ง rm config.txt", cmdTarget: "rm config.txt", exp: 20, completed: false },
    { id: 10, category: "Level 3: Permissions & Admin", title: "3.1 เปลี่ยนสิทธิ์ให้รันไฟล์ได้", desc: "ใช้คำสั่ง chmod +x robot_lab", cmdTarget: "chmod +x robot_lab", exp: 30, completed: false },
    { id: 11, category: "Level 3: Permissions & Admin", title: "3.2 อัปเดตคลังแพ็กเกจ", desc: "ใช้คำสั่ง sudo apt update", cmdTarget: "sudo apt update", exp: 35, completed: false },
    { id: 12, category: "Level 3: Permissions & Admin", title: "3.3 เช็คชื่อผู้ใช้", desc: "ใช้คำสั่ง whoami", cmdTarget: "whoami", exp: 10, completed: false },
    { id: 13, category: "Level 4: Mechatronics & Control", title: "4.1 เริ่มทำงานระบบ PLC", desc: "ใช้คำสั่ง systemctl start plc", cmdTarget: "systemctl start plc", exp: 40, completed: false },
    { id: 14, category: "Level 4: Mechatronics & Control", title: "4.2 ปิดระบบ PLC", desc: "ใช้คำสั่ง systemctl stop plc", cmdTarget: "systemctl stop plc", exp: 30, completed: false },
    { id: 15, category: "Level 4: Mechatronics & Control", title: "4.3 ล้างหน้าจอ Terminal", desc: "ใช้คำสั่ง clear", cmdTarget: "clear", exp: 10, completed: false },
  ]);

  const totalExp = missions.filter(m => m.completed).reduce((sum, m) => sum + m.exp, 0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const intv = setInterval(updateTime, 1000);
    return () => clearInterval(intv);
  }, []);

  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [history]);

  const handleSaveEditorContent = () => {
    if (editingFileId) {
      setVfs((prev) =>
        prev.map((item) =>
          item.id === editingFileId ? { ...item, content: editorContent } : item
        )
      );
    }
  };

  const handlePowerButton = () => {
    if (powerState === "on") {
      setPowerState("off");
      setWindows([]);
    } else if (powerState === "off") {
      setPowerState("boot");
      setTimeout(() => {
        setPowerState("on");
        setWindows([
          { id: "term_1", title: "student@mecharayong-os: ~", type: "terminal", x: 50, y: 40, w: 680, h: 440, zIndex: 10, isMinimized: false },
          { id: "academy_1", title: "Mecha-Academy E-Learning", type: "academy", x: 220, y: 80, w: 720, h: 480, zIndex: 11, isMinimized: false },
        ]);
        setHistory([{ type: "out", text: "Welcome to MECHARAYONG LINUX OS 2026\nType 'help' for support or complete missions in 'Mecha-Academy'.\n", styleClass: "system" }]);
      }, 3000);
    }
  };

  // ---------------------------------------------------------
  // 🪟 RESIZING & DRAGGING MOUSE EVENT HANDLERS
  // ---------------------------------------------------------
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingWinId) {
        setWindows(prev => prev.map(w => w.id === draggingWinId ? { ...w, x: Math.max(0, e.clientX - dragOffset.x), y: Math.max(30, e.clientY - dragOffset.y) } : w));
      } else if (resizing) {
        const dx = e.clientX - resizing.startX;
        const dy = e.clientY - resizing.startY;
        setWindows(prev => prev.map(w => {
          if (w.id === resizing.winId) {
            let newW = w.w;
            let newH = w.h;
            if (resizing.dir.includes("r")) newW = Math.max(320, resizing.startW + dx);
            if (resizing.dir.includes("b")) newH = Math.max(220, resizing.startH + dy);
            return { ...w, w: newW, h: newH };
          }
          return w;
        }));
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingWinId(null);
      setResizing(null);
    };

    if (draggingWinId || resizing) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [draggingWinId, resizing, dragOffset]);

  const bringToFront = (id: string) => {
    const z = topZIndex + 1; setTopZIndex(z);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: z, isMinimized: false } : w));
  };
  const closeWindow = (id: string) => setWindows(prev => prev.filter(w => w.id !== id));
  const toggleMin = (id: string) => setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  const openApp = (type: "terminal" | "files" | "editor" | "academy", title: string) => {
    const existing = windows.find(w => w.type === type);
    if (existing) { bringToFront(existing.id); return; }
    const z = topZIndex + 1; setTopZIndex(z);
    setWindows(prev => [...prev, { id: `${type}_${Date.now()}`, title, type, x: 80 + prev.length * 20, y: 50 + prev.length * 20, w: 700, h: 460, zIndex: z, isMinimized: false }]);
  };

  const handleOpenItem = (item: VFSItem) => {
    if (item.type === "folder") openApp("files", `Files - ${item.name}`);
    else {
      setEditingFileId(item.id); setEditorContent(item.content || "");
      openApp("editor", `Gedit - ${item.name}`);
    }
  };

  // ---------------------------------------------------------
  // 🛠️ COMMAND ENGINE & MISSION EVALUATOR
  // ---------------------------------------------------------
  const resolvePath = (base: string, target: string) => {
    if (!target) return base;
    let full = target.startsWith("/") ? target : target.startsWith("~") ? target.replace("~", "/home/student") : `${base}/${target}`;
    const parts = full.split("/").filter(p => p !== "" && p !== ".");
    const stack: string[] = [];
    parts.forEach(p => { if (p === "..") stack.pop(); else stack.push(p); });
    return "/" + stack.join("/");
  };

  const getPathName = (path: string) => path.split("/").pop() || "";
  const getParentPath = (path: string) => path.substring(0, path.lastIndexOf("/")) || "/";

  const checkMissions = (cmdFull: string) => {
    const cleanCmd = cmdFull.toLowerCase().replace(/['"]/g, "").replace(/\s+/g, " ").trim();
    setMissions(prev => {
      let updated = false;
      const next = prev.map(m => {
        if (!m.completed && cleanCmd === m.cmdTarget) {
          updated = true; return { ...m, completed: true };
        }
        return m;
      });
      return updated ? next : prev;
    });
  };

  const handleCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;
    
    checkMissions(cmd);

    let isSudo = false;
    let procCmd = cmd;
    if (cmd.startsWith("sudo ")) { isSudo = true; procCmd = procCmd.substring(5).trim(); }

    const args = procCmd.split(" ").filter(Boolean);
    const mCmd = args[0];

    const addOut = (text: React.ReactNode, style = "") => {
      setHistory(p => [...p, { type: "cmd", command: rawCmd, dirPath: currentPath.replace("/home/student", "~") }, { type: "out", text, styleClass: style }]);
    };

    if (mCmd === "pwd") addOut(currentPath);
    else if (mCmd === "cd") {
      const target = resolvePath(currentPath, args[1] || "~");
      if (target === "/") setCurrentPath("/");
      else {
        const found = vfs.find(f => f.type === "folder" && `${f.path}/${f.name}` === target);
        if (found || target === "/home/student") setCurrentPath(target);
        else addOut(`bash: cd: ${args[1]}: No such file or directory`, "error");
      }
    }
    else if (mCmd === "ls" || mCmd === "ll") {
      const targetPath = resolvePath(currentPath, args[1] || ".");
      const items = vfs.filter(f => f.path === targetPath);
      if (items.length === 0) addOut("");
      else {
        const out = items.map(i => {
          const color = i.type === "folder" ? "#38bdf8" : i.perm.includes("x") ? "#4ade80" : "#f4f4f5";
          return `<span style="color:${color}; font-weight:700; margin-right:12px;">${i.name}${i.type === "folder" ? "/" : ""}</span>`;
        }).join("");
        addOut(<div dangerouslySetInnerHTML={{ __html: out }} />);
      }
    }
    else if (mCmd === "mkdir") {
      if (!args[1]) addOut("mkdir: missing operand", "error");
      else {
        const target = resolvePath(currentPath, args[1]);
        const name = getPathName(target); const parent = getParentPath(target);
        setVfs(p => [...p, { id: Date.now().toString(), name, type: "folder", path: parent, perm: "drwxr-xr-x" }]);
        addOut("");
      }
    }
    else if (mCmd === "touch") {
      if (!args[1]) addOut("touch: missing operand", "error");
      else {
        const target = resolvePath(currentPath, args[1]);
        setVfs(p => [...p, { id: Date.now().toString(), name: getPathName(target), type: "file", path: getParentPath(target), perm: "-rw-r--r--", content: "" }]);
        addOut("");
      }
    }
    else if (mCmd === "rm") {
      const target = resolvePath(currentPath, args[1] || "");
      setVfs(p => p.filter(f => `${f.path}/${f.name}` !== target));
      addOut("");
    }
    else if (mCmd === "cat") {
      const target = resolvePath(currentPath, args[1] || "");
      const found = vfs.find(f => `${f.path}/${f.name}` === target);
      if (found && found.type === "file") addOut(found.content || "");
      else addOut(`cat: ${args[1]}: No such file`, "error");
    }
    else if (mCmd === "chmod") {
      if (!args[1] || !args[2]) addOut("chmod: missing operand", "error");
      else {
        const target = resolvePath(currentPath, args[2]);
        setVfs(p => p.map(f => `${f.path}/${f.name}` === target ? { ...f, perm: "-rwxr-xr-x" } : f));
        addOut("");
      }
    }
    else if (mCmd === "echo") {
      const redirectIdx = args.findIndex(a => a === ">" || a === ">>");
      if (redirectIdx !== -1) {
        const text = args.slice(1, redirectIdx).join(" ").replace(/['"]/g, "");
        const fileName = args[redirectIdx + 1];
        const target = resolvePath(currentPath, fileName);
        setVfs(p => {
          const exists = p.find(f => `${f.path}/${f.name}` === target);
          if (exists) return p.map(f => f.id === exists.id ? { ...f, content: args[redirectIdx]===">>" ? f.content+"\n"+text : text } : f);
          return [...p, { id: Date.now().toString(), name: getPathName(target), type: "file", path: getParentPath(target), perm: "-rw-r--r--", content: text }];
        });
        addOut("");
      } else {
        addOut(args.slice(1).join(" ").replace(/['"]/g, ""));
      }
    }
    else if (mCmd === "systemctl") {
      if (args[1] === "start" && args[2] === "plc") addOut("PLC Service Online!", "success");
      else if (args[1] === "stop" && args[2] === "plc") addOut("PLC Service Stopped", "info");
      else addOut("Usage: systemctl <start|stop> <plc>", "error");
    }
    else if (mCmd === "whoami") addOut(isSudo ? "root" : "student", "success");
    else if (mCmd === "apt" || mCmd === "apt-get") {
      if (!isSudo) addOut("E: Could not open lock file - Permission denied\nAre you root?", "error");
      else if (args[1] === "update") addOut("Get:1 http://repo.mecharayong.ac.th/linux 2026 InRelease\nReading package lists... Done", "success");
      else addOut("Usage: sudo apt update", "info");
    }
    else if (mCmd === "clear") { setHistory([]); setInputVal(""); return; }
    else if (mCmd === "shutdown" || mCmd === "poweroff") {
      addOut("System is going down for power-off NOW!", "error");
      setTimeout(() => {
        setPowerState("off");
        setWindows([]);
      }, 1500);
    }
    else if (mCmd === "help") {
      addOut("Basic Commands:\n  cd, pwd, ls     - Navigation\n  mkdir, touch, rm - File Ops\n  chmod +x <file> - Set executable\n  echo \"txt\" > f  - Write file\n  cat <file>      - Read file\n  sudo apt update - Package manager\n  clear, poweroff - System");
    }
    else { addOut(`bash: ${mCmd}: command not found`, "error"); }
    
    setInputVal("");
  };

  const desktopItems = vfs.filter(f => f.path === "/home/student/Desktop");
  const categories = Array.from(new Set(missions.map(m => m.category)));

  return (
    <>
      <Head><title>MECHARAYONG LINUX OS 2026 E-Learning</title><link href="/logo/MechaLogo.png" rel="icon" /></Head>
      
      {/* แทรก Global Style ตรงนี้เพื่อลบขอบขาว 100% */}
      <GlobalStyle />

      <FullScreenPage>
        <Container>
          <MonitorFrame>
            <ComputerBar>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PowerLed $status={powerState} /> <span>MECHARAYONG LINUX OS 2026</span>
              </div>
              <Button type="primary" danger={powerState === "on"} size="small" icon={<PoweroffOutlined />} onClick={handlePowerButton}>
                {powerState === "on" ? "Power Off" : "Power On"}
              </Button>
            </ComputerBar>

            <ScreenDisplay $powerState={powerState}>
              {powerState === "off" && (
                <Overlay><PoweroffOutlined style={{ fontSize: 48 }} /><div style={{ marginTop: 16 }}>SYSTEM OFF</div></Overlay>
              )}
              {powerState === "boot" && (
                <Overlay style={{ background: "#09090b" }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#38bdf8", textAlign: "center" }}>MECHARAYONG LINUX OS 2026</div>
                  <div style={{ color: "#a1a1aa", fontWeight: 600, marginTop: 8 }}>Rayong Technical College - Mechatronics & Robotics OS</div>
                  <BootSpinner />
                </Overlay>
              )}
              {powerState === "on" && (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                  <TopPanel>
                    <div>Activities</div> <div>{clock}</div>
                    <div style={{ display: "flex", gap: 12 }}><WifiOutlined /><SoundOutlined /><PoweroffOutlined onClick={() => setPowerState("off")} style={{ cursor: "pointer" }} /></div>
                  </TopPanel>

                  <DesktopMainArea>
                    <LeftDock>
                      <Tooltip title="Terminal" placement="right"><div className="dock-icon" onClick={() => openApp("terminal", "student@mecharayong-os: ~")}><CodeOutlined /></div></Tooltip>
                      <Tooltip title="Files" placement="right"><div className="dock-icon" onClick={() => openApp("files", "File Manager")}><FolderOutlined style={{ color: "#38bdf8" }} /></div></Tooltip>
                      <Tooltip title="Mecha-Academy (E-Learning)" placement="right"><div className="dock-icon" onClick={() => openApp("academy", "Mecha-Academy E-Learning")}><BookOutlined style={{ color: "#38bdf8" }} /></div></Tooltip>
                    </LeftDock>

                    <Workspace>
                      {desktopItems.map((item) => (
                        <DesktopIcon key={item.id} onDoubleClick={() => handleOpenItem(item)}>
                          <div className={`icon-box ${item.type}`}>{item.type === "folder" ? <FolderOutlined /> : <FileTextOutlined />}</div>
                          <div className="label">{item.name}</div>
                        </DesktopIcon>
                      ))}

                      {windows.map((win) => (
                        <WindowContainer key={win.id} $x={win.x} $y={win.y} $w={win.w} $h={win.h} $zIndex={win.zIndex} $isMinimized={win.isMinimized} onClick={() => bringToFront(win.id)}>
                          <WindowTitleBar onMouseDown={(e) => { e.stopPropagation(); bringToFront(win.id); setDraggingWinId(win.id); setDragOffset({ x: e.clientX - win.x, y: e.clientY - win.y }); }}>
                            <span>{win.title}</span>
                            <div className="controls">
                              <div className="btn min" onClick={(e) => { e.stopPropagation(); toggleMin(win.id); }}><MinusOutlined /></div>
                              <div className="btn max" onClick={(e) => { e.stopPropagation(); setWindows(p => p.map(w => w.id === win.id ? { ...w, w: 780, h: 520, x: 40, y: 40 } : w)); }}><BorderOutlined /></div>
                              <div className="btn close" onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}><CloseOutlined /></div>
                            </div>
                          </WindowTitleBar>

                          {/* App: Terminal */}
                          {win.type === "terminal" && (
                            <TerminalContent ref={terminalRef} onClick={() => inputRef.current?.focus()}>
                              {history.map((h, i) => (
                                <div key={i}>
                                  {h.type === "cmd" ? (
                                    <InputRow style={{ marginBottom: 4 }}>
                                      <PromptLabel><span className="host">student@mecharayong-os</span>:<span className="path">{h.dirPath}</span><span className="sym">$</span></PromptLabel>
                                      <span>{h.command}</span>
                                    </InputRow>
                                  ) : ( <OutputLine className={h.styleClass}>{h.text}</OutputLine> )}
                                </div>
                              ))}
                              <InputRow>
                                <PromptLabel><span className="host">student@mecharayong-os</span>:<span className="path">{currentPath.replace("/home/student", "~")}</span><span className="sym">$</span></PromptLabel>
                                <TermInput ref={inputRef} value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCommand(inputVal); }} autoFocus spellCheck={false} />
                              </InputRow>
                            </TerminalContent>
                          )}

                          {/* App: Files */}
                          {win.type === "files" && (
                            <div style={{ flex: 1, background: "#18181b", padding: 20, color: "#fff", overflowY: "auto" }}>
                              <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><FolderOpenOutlined /> /home/student</div>
                              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                {vfs.filter(f => f.path === "/home/student" || f.path === "/home/student/Desktop").map(item => (
                                  <div key={item.id} onDoubleClick={() => handleOpenItem(item)} style={{ padding: 12, background: "#27272a", borderRadius: 8, textAlign: "center", width: 90, cursor: "pointer" }}>
                                    <div style={{ fontSize: 32, color: item.type === "folder" ? "#38bdf8" : "#fff" }}>{item.type === "folder" ? <FolderOutlined /> : <FileTextOutlined />}</div>
                                    <div style={{ fontSize: 12, marginTop: 8, wordBreak: "break-all" }}>{item.name}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* App: Editor */}
                          {win.type === "editor" && (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#18181b" }}>
                              <div style={{ padding: 8, background: "#27272a", display: "flex", justifyContent: "flex-end" }}>
                                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveEditorContent}>Save</Button>
                              </div>
                              <Input.TextArea value={editorContent} onChange={(e) => setEditorContent(e.target.value)} style={{ flex: 1, background: "#09090b", color: "#4ade80", border: "none", borderRadius: 0, resize: "none", fontFamily: "monospace" }} />
                            </div>
                          )}

                          {/* App: Mecha-Academy (Comprehensive E-Learning) */}
                          {win.type === "academy" && (
                            <div style={{ flex: 1, background: "#fafafa", padding: 20, overflowY: "auto" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <div>
                                  <h2 style={{ margin: 0, color: "#1e1b4b", fontWeight: 800 }}><BookOutlined /> Mecha-Academy Curriculum</h2>
                                  <span style={{ fontSize: 12, color: "#64748b" }}>หลักสูตรเรียนรู้ระบบปฏิบัติการ MECHARAYONG LINUX OS 2026</span>
                                </div>
                                <Badge count={`${totalExp} / 315 EXP`} style={{ backgroundColor: '#52c41a', fontWeight: 700 }} />
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {categories.map(cat => (
                                  <Card key={cat} size="small" title={<span style={{ color: "#1e1b4b", fontWeight: 700 }}>{cat}</span>} style={{ borderRadius: 12 }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                      {missions.filter(m => m.category === cat).map(m => (
                                        <div key={m.id} style={{ padding: 12, background: m.completed ? "#f0fdf4" : "#f8fafc", border: `1px solid ${m.completed ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: m.completed ? "#166534" : "#18181b", display: "flex", alignItems: "center", gap: 8 }}>
                                              {m.completed ? <CheckCircleFilled style={{ color: "#22c55e" }} /> : <TrophyOutlined style={{ color: "#a1a1aa" }} />} {m.title}
                                            </div>
                                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{m.desc}</div>
                                          </div>
                                          <Tag color={m.completed ? "green" : "blue"} style={{ fontWeight: 700 }}>+{m.exp} EXP</Tag>
                                        </div>
                                      ))}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* RESIZE HANDLES (RIGHT, BOTTOM, CORNER) */}
                          <ResizeEdgeRight onMouseDown={(e) => { e.stopPropagation(); bringToFront(win.id); setResizing({ winId: win.id, dir: "r", startX: e.clientX, startY: e.clientY, startW: win.w, startH: win.h }); }} />
                          <ResizeEdgeBottom onMouseDown={(e) => { e.stopPropagation(); bringToFront(win.id); setResizing({ winId: win.id, dir: "b", startX: e.clientX, startY: e.clientY, startW: win.w, startH: win.h }); }} />
                          <ResizeCornerBottomRight onMouseDown={(e) => { e.stopPropagation(); bringToFront(win.id); setResizing({ winId: win.id, dir: "br", startX: e.clientX, startY: e.clientY, startW: win.w, startH: win.h }); }} />
                        </WindowContainer>
                      ))}
                    </Workspace>
                  </DesktopMainArea>
                </div>
              )}
            </ScreenDisplay>
          </MonitorFrame>
        </Container>
      </FullScreenPage>
    </>
  );
}