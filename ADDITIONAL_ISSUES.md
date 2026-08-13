# RYTC E-learning - Additional Issues & Solutions

## 🐛 Additional Issues Found

### **Issue 11: Missing Global Styles Import**
**Location:** [src/pages/_app.tsx](src/pages/_app.tsx)
**Severity:** ⚠️ Medium (Styling)
**Status:** ⚠️ ISSUE FOUND

**Problem:**
```typescript
// Line 6 - commented out
// หากมีไฟล์ globals.css อยู่ในโฟลเดอร์ src/styles ให้ใช้บรรทัดล่างนี้ (ถ้าไม่มีให้ลบออก)
// import "../styles/globals.css";
```

The globals.css import is commented out, which may cause missing global styles.

**Solution:**
```typescript
import type { AppProps } from "next/app";
import { ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import theme from "../config/theme";
import "../styles/globals.css";  // ← Uncomment this line

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider locale={thTH} theme={theme}>
      <Component {...pageProps} />
    </ConfigProvider>
  );
}
```

---

### **Issue 12: Missing Process.env Validation**
**Location:** [src/services/apiClient.ts](src/services/apiClient.ts#L4)
**Severity:** ⚠️ Low (Configuration)
**Status:** ⚠️ WARNING

**Problem:**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
```

If `NEXT_PUBLIC_API_URL` is not set, it defaults to localhost which may cause issues in production.

**Solution:**
Add environment variable validation:
```typescript
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn('Warning: NEXT_PUBLIC_API_URL is not set for production');
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
```

Or create a `.env.local` file:
```
NEXT_PUBLIC_API_URL=https://your-production-api.com/api
```

---

### **Issue 13: Session Expiry Handling - Cross-Tab Issue**
**Location:** [src/services/apiClient.ts](src/services/apiClient.ts#L37)
**Severity:** ⚠️ Medium (Security)
**Status:** ⚠️ POTENTIAL ISSUE

**Problem:**
```typescript
if (error.response?.status === 401) {
  Cookies.remove("token");
  Cookies.remove("user_role");
  localStorage.removeItem("user");
  // This only works in current tab
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}
```

This only handles 401 errors in the current tab. Users may be logged in on multiple tabs.

**Solution:**
Add cross-tab logout notification:
```typescript
if (error.response?.status === 401) {
  Cookies.remove("token");
  Cookies.remove("user_role");
  localStorage.removeItem("user");
  
  // Notify other tabs
  if (typeof window !== 'undefined') {
    localStorage.setItem('logout_event', Date.now().toString());
  }
  
  if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
    message.error("เซสชั่นหมดอายุ กรุณาล็อกอินใหม่อีกครั้ง");
    window.location.href = "/login";
  }
}

// Add listener in _app.tsx:
useEffect(() => {
  const handleLogout = (e: StorageEvent) => {
    if (e.key === 'logout_event') {
      window.location.href = '/login';
    }
  };
  
  window.addEventListener('storage', handleLogout);
  return () => window.removeEventListener('storage', handleLogout);
}, []);
```

---

### **Issue 14: Styled-Components Server-Side Rendering**
**Location:** [src/pages/_document.tsx](src/pages/_document.tsx)
**Severity:** ✅ OK (Already Implemented)
**Status:** ✅ GOOD

The project correctly implements ServerStyleSheet for styled-components SSR. No issues here.

---

### **Issue 15: Missing Theme Configuration Type Safety**
**Location:** [src/config/theme.ts](src/config/theme.ts)
**Severity:** ⚠️ Low (Type Safety)
**Status:** 🔍 NEEDS CHECKING

**Recommendation:**
Ensure theme.ts has proper TypeScript types:
```typescript
import { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0a9275',
    // ... other theme settings
  },
};

export default theme;
```

---

## 🚀 Quick Fixes Implementation Guide

### **Fix 1: Uncomment Global Styles (1 minute)**

Replace in [src/pages/_app.tsx](src/pages/_app.tsx):

**Before:**
```typescript
import type { AppProps } from "next/app";
import { ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import theme from "../config/theme"; // 
// หากมีไฟล์ globals.css อยู่ในโฟลเดอร์ src/styles ให้ใช้บรรทัดล่างนี้ (ถ้าไม่มีให้ลบออก)
```

**After:**
```typescript
import type { AppProps } from "next/app";
import { ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";
import theme from "../config/theme";
import "../styles/globals.css";  // ← UNCOMMENTED
```

---

### **Fix 2: Add Environment Variables (2 minutes)**

Create `.env.local` file in project root:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
```

For production, update `.env.production`:
```env
NEXT_PUBLIC_API_URL=https://your-production-api.com/api
NODE_ENV=production
```

---

### **Fix 3: Fix Next.js Config (1 minute)**

Check [next.config.js](next.config.js) has proper configuration:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  // Add other configurations as needed
};

module.exports = nextConfig;
```

---

## 🔧 Summary of All Issues

| # | Issue | File | Severity | Status | Fix Time |
|---|-------|------|----------|--------|----------|
| 1 | Large component | PLCsim/index.tsx | Medium | Refactor | 2-3 hours |
| 2 | Unicode path | Project folder | Medium | Rename | 30 mins |
| 3 | No Error Boundary | PLCsim/index.tsx | High | Add component | 30 mins |
| 4 | Complex useEffect | PLCsim/index.tsx | Medium | Optimize | 30 mins |
| 5 | Too many useState | PLCsim/index.tsx | High | Use useReducer | 1 hour |
| 6 | Memory leak risk | PLCsim/index.tsx | High | Fix listeners | 30 mins |
| 7 | No input validation | PLCsim/index.tsx | Medium | Add validation | 30 mins |
| 8 | TypeScript not strict | All files | Medium | Update config | 15 mins |
| 9 | Browser compatibility | PLCsim/index.tsx | Low | Add polyfills | 20 mins |
| 10 | CSS tight coupling | PLCsim/index.tsx | Low | Refactor | 1 hour |
| 11 | Missing globals.css | _app.tsx | Medium | **UNCOMMENT** | ✅ 1 min |
| 12 | No env validation | apiClient.ts | Low | Add checks | 10 mins |
| 13 | Session handling | apiClient.ts | Medium | Improve | 20 mins |
| 14 | SSR setup | _document.tsx | N/A | ✅ OK | - |
| 15 | Theme types | config/theme.ts | Low | Check | 5 mins |

---

## ✅ Immediate Actions

**DO THESE FIRST:**
1. ✅ Uncomment the `import "../styles/globals.css";` in `_app.tsx`
2. ✅ Create `.env.local` with proper API URL
3. ✅ Check if `next.config.js` has styled-components compiler option

**THEN DO:**
4. ✅ Run `npm run dev` and check browser console for any errors
5. ✅ Test the PLCsim page loads without errors
6. ✅ Try the PLC simulation RUN feature

---

## 📝 How to Check for Runtime Errors

1. **Open Browser DevTools:** Press `F12`
2. **Go to Console Tab:** Click "Console"
3. **Check for Red Errors:** Any error messages will be displayed in red
4. **Go to Network Tab:** Check if API calls are succeeding (green) or failing (red)
5. **Go to Performance Tab:** Check if CPU usage is reasonable

---

**Generated:** August 13, 2026  
**Project:** RYTC E-learning Platform  
**Document:** Additional Issues & Solutions
