import Link from "next/link";
import {
  HiOutlineArrowRight,
  HiOutlineBeaker,
  HiOutlineBookOpen,
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import AppShell from "@/components/motor-control/AppShell";
import styles from "@/styles/MotorControl.module.css";

export default function MotorControlHome() {
  return (
    <AppShell>
      <div className={styles.homePage}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>ENGINEERING LEARNING PLATFORM · LAB 01</span>
              <h1>
                Motor Control
                <span>Training Lab</span>
              </h1>
              <p>เรียนรู้พื้นฐาน แล้วลงมือประกอบวงจรในห้องทดลองเสมือน</p>
              <div className={styles.heroActions}>
                <Link href="/Motorcontrol/knowledge" className={styles.heroPrimaryAction}>
                  <HiOutlineBookOpen /> เริ่มเรียน <HiOutlineArrowRight />
                </Link>
                <Link href="/Motorcontrol/practice" className={styles.heroSecondaryAction}>
                  <HiOutlineBeaker /> ทดลองต่อวงจร
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.homeSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>เลือกสิ่งที่ต้องการทำ</h2>
            </div>
          </div>

          <div className={styles.modeGrid}>
            <article className={styles.modeCard}>
              <div className={styles.modeCardHeader}>
                <div className={styles.modeCardIcon}><HiOutlineBookOpen /></div>
              </div>
              <h3>เรียนรู้พื้นฐาน</h3>
              <Link href="/Motorcontrol/knowledge" className={styles.primaryAction}>
                เปิดบทเรียน <HiOutlineArrowRight />
              </Link>
            </article>

            <article className={`${styles.modeCard} ${styles.modeCardPractice}`}>
              <div className={styles.modeCardHeader}>
                <div className={styles.modeCardIcon}><HiOutlineWrenchScrewdriver /></div>
              </div>
              <h3>ทดลองต่อวงจร</h3>
              <Link href="/Motorcontrol/practice" className={styles.primaryAction}>
                เปิดห้องทดลอง <HiOutlineArrowRight />
              </Link>
            </article>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
