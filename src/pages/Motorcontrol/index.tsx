import Link from "next/link";
import {
  HiOutlineArrowRight,
  HiOutlineBeaker,
  HiOutlineBolt,
  HiOutlineBookOpen,
  HiOutlineCheckBadge,
  HiOutlineCpuChip,
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import AppShell from "@/components/motor-control/AppShell";
import { featuredTopics } from "@/data/motorControl";
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
              <p>
                เรียนรู้ระบบควบคุมมอเตอร์อย่างเป็นขั้นตอน ตั้งแต่รู้จักอุปกรณ์ อ่านวงจร
                ไปจนถึงการต่อสายและจำลองการทำงานในห้องทดลองเสมือน
              </p>
              <div className={styles.heroActions}>
                <Link href="/Motorcontrol/knowledge" className={styles.heroPrimaryAction}>
                  <HiOutlineBookOpen /> เริ่มเรียนพื้นฐาน <HiOutlineArrowRight />
                </Link>
                <Link href="/Motorcontrol/practice" className={styles.heroSecondaryAction}>
                  <HiOutlineBeaker /> เปิด Practice Lab
                </Link>
              </div>
              <div className={styles.heroStats}>
                <span className={styles.heroStat}><HiOutlineBookOpen /> 28 บทเรียน</span>
                <span className={styles.heroStat}><HiOutlineBeaker /> 10 แบบฝึกหัด</span>
                <span className={styles.heroStat}><HiOutlineCheckBadge /> ตรวจวงจรอัตโนมัติ</span>
              </div>
            </div>

            <aside className={styles.heroGuide} aria-label="เส้นทางการเรียนรู้แนะนำ">
              <span className={styles.heroGuideLabel}>RECOMMENDED LEARNING PATH</span>
              <h2>เริ่มต้นได้ใน 3 ขั้นตอน</h2>
              <div className={styles.heroGuideStep}>
                <strong>01</strong>
                <div><b>เรียนรู้พื้นฐาน</b><span>ทำความเข้าใจอุปกรณ์และหลักการทำงาน</span></div>
              </div>
              <div className={styles.heroGuideStep}>
                <strong>02</strong>
                <div><b>ประกอบวงจร</b><span>ลากอุปกรณ์และต่อสายตามโจทย์</span></div>
              </div>
              <div className={styles.heroGuideStep}>
                <strong>03</strong>
                <div><b>ตรวจสอบและจำลอง</b><span>ตรวจความถูกต้องก่อนเริ่ม Simulation</span></div>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.homeSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>CHOOSE YOUR LEARNING MODE</span>
              <h2>เลือกเส้นทางที่เหมาะกับคุณ</h2>
            </div>
            <p>หากเพิ่งเริ่มต้น แนะนำให้อ่านบทเรียนก่อน แล้วจึงทดลองประกอบวงจรใน Practice Lab</p>
          </div>

          <div className={styles.modeGrid}>
            <article className={styles.modeCard}>
              <div className={styles.modeCardHeader}>
                <div className={styles.modeCardIcon}><HiOutlineBookOpen /></div>
                <span className={styles.modeStep}>STEP 01 · LEARN</span>
              </div>
              <h3>เรียนรู้พื้นฐาน Motor Control</h3>
              <p>ทำความเข้าใจอุปกรณ์ วงจรกำลัง วงจรควบคุม และระบบป้องกันอย่างเป็นลำดับ</p>
              <ul className={styles.modeFeatures}>
                <li><HiOutlineCheckBadge /> บทเรียน 28 หัวข้อ พร้อมคำอธิบาย</li>
                <li><HiOutlineCheckBadge /> เรียนตามหมวดหมู่และระดับความยาก</li>
                <li><HiOutlineCheckBadge /> เหมาะสำหรับผู้เริ่มต้นและทบทวน</li>
              </ul>
              <Link href="/Motorcontrol/knowledge" className={styles.primaryAction}>
                เริ่มเรียนเนื้อหา <HiOutlineArrowRight />
              </Link>
            </article>

            <article className={`${styles.modeCard} ${styles.modeCardPractice}`}>
              <div className={styles.modeCardHeader}>
                <div className={styles.modeCardIcon}><HiOutlineWrenchScrewdriver /></div>
                <span className={styles.modeStep}>STEP 02 · PRACTICE</span>
              </div>
              <h3>ฝึกประกอบวงจรใน Practice Lab</h3>
              <p>ทดลองวางอุปกรณ์ ต่อสาย และตรวจสอบลำดับการทำงานในพื้นที่จำลองเสมือนจริง</p>
              <ul className={styles.modeFeatures}>
                <li><HiOutlineCheckBadge /> ลากและจัดวางอุปกรณ์ได้อย่างอิสระ</li>
                <li><HiOutlineCheckBadge /> กำหนดแนวสายและจุดหักได้เอง</li>
                <li><HiOutlineCheckBadge /> ตรวจวงจรก่อนเริ่ม Simulation</li>
              </ul>
              <Link href="/Motorcontrol/practice" className={styles.primaryAction}>
                เปิดห้องทดลอง <HiOutlineArrowRight />
              </Link>
            </article>
          </div>
        </section>

        <section className={styles.homeSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>TRAINING COVERAGE</span>
              <h2>หัวข้อที่คุณจะได้เรียนรู้</h2>
            </div>
            <p>หัวข้อสำคัญที่พบในงานซ่อมบำรุง ระบบอัตโนมัติ และตู้ควบคุมไฟฟ้าอุตสาหกรรม</p>
          </div>
          <div className={styles.topicGrid}>
            {featuredTopics.map((topic, index) => {
              const Icon = topic.icon;
              return (
                <Link href="/Motorcontrol/knowledge" className={styles.topicItem} key={topic.label}>
                  <span className={styles.topicIcon}><Icon /></span>
                  <span className={styles.topicCopy}>
                    <small>MODULE {String(index + 1).padStart(2, "0")}</small>
                    <strong>{topic.label}</strong>
                  </span>
                  <HiOutlineArrowRight className={styles.topicArrow} />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
