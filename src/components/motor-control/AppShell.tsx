import type { ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  HiOutlineAcademicCap,
  HiOutlineArrowLeft,
  HiOutlineBeaker,
  HiOutlineBolt,
  HiOutlineBookOpen,
  HiOutlineSquares2X2,
} from "react-icons/hi2";
import styles from "@/styles/MotorControl.module.css";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  fullWidth?: boolean;
  labMode?: boolean;
}

const navItems = [
  { href: "/Motorcontrol", label: "Home", icon: HiOutlineSquares2X2, exact: true },
  { href: "/Motorcontrol/knowledge", label: "Knowledge", icon: HiOutlineBookOpen },
  { href: "/Motorcontrol/practice", label: "Practice Lab", icon: HiOutlineBeaker },
];

export default function AppShell({
  children,
  title = "Motor Control Training Lab",
  description = "เรียนรู้และฝึกต่อวงจรควบคุมมอเตอร์ใน Virtual Electrical Lab",
  fullWidth = false,
  labMode = false,
}: AppShellProps) {
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? router.pathname === href : router.pathname.startsWith(href);

  return (
    <div className={`${styles.appRoot} ${labMode ? styles.labRoot : ""}`}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className={styles.topNavbar}>
        <Link href="/Motorcontrol" className={styles.brand} aria-label="Motor Control Training Lab">
          <span className={styles.brandMark}>
            <HiOutlineBolt />
          </span>
          <span className={styles.brandCopy}>
            <strong>MOTOR LAB</strong>
            <small>INDUSTRIAL TRAINING SYSTEM</small>
          </span>
        </Link>

        <nav className={styles.mainNav} aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href, item.exact) ? styles.navLinkActive : ""}`}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.navMeta}>
          <span className={styles.systemStatus}><i /> SYSTEM READY</span>
          <span className={styles.profileBadge}><HiOutlineAcademicCap /> RYTC</span>
        </div>
      </header>

      <main className={fullWidth ? styles.fullWidthMain : styles.mainContainer}>{children}</main>

      {!labMode && (
        <footer className={styles.siteFooter}>
          <div>
            <span className={styles.footerBrand}><HiOutlineBolt /> MOTOR CONTROL LAB</span>
            <span>Rayong Technical College · Mechatronics & Robotics</span>
          </div>
          <Link href="/" className={styles.backToWil}><HiOutlineArrowLeft /> กลับสู่ WIL Progression</Link>
        </footer>
      )}
    </div>
  );
}
