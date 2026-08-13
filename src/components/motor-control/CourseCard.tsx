import Link from "next/link";
import {
  HiOutlineArrowRight,
  HiOutlineBolt,
  HiOutlineBookOpen,
  HiOutlineClock,
  HiOutlineCog6Tooth,
  HiOutlineCpuChip,
  HiOutlineShieldCheck,
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import { TbCircuitSwitchOpen } from "react-icons/tb";
import type { Lesson } from "@/types/motorControl";
import styles from "@/styles/MotorControl.module.css";

interface CourseCardProps {
  lesson: Lesson;
}

const categoryIcons = {
  Basics: HiOutlineBookOpen,
  Motors: HiOutlineCog6Tooth,
  Components: HiOutlineCpuChip,
  "Motor Circuits": TbCircuitSwitchOpen,
  "Motor Drives": HiOutlineBolt,
  Protection: HiOutlineShieldCheck,
  Troubleshooting: HiOutlineWrenchScrewdriver,
};

export default function CourseCard({ lesson }: CourseCardProps) {
  const Icon = categoryIcons[lesson.category];

  return (
    <article className={styles.courseCard}>
      <div className={styles.courseCardTop}>
        <span className={`${styles.courseIcon} ${styles[`category${lesson.category.replace(/\s/g, "")}`]}`}>
          <Icon />
        </span>
        <span className={styles.lessonNumber}>{String(lesson.index).padStart(2, "0")}</span>
      </div>
      <div className={styles.courseMetaRow}>
        <span>{lesson.category}</span>
        <span className={`${styles.levelPill} ${styles[`level${lesson.level}`]}`}>{lesson.level}</span>
      </div>
      <h3>
        <Link href={`/Motorcontrol/lesson/${lesson.id}`}>{lesson.title}</Link>
      </h3>
      <p>{lesson.description}</p>
      <div className={styles.courseCardFooter}>
        <span><HiOutlineClock /> {lesson.duration}</span>
        <Link href={`/Motorcontrol/lesson/${lesson.id}`}>
          LEARN <HiOutlineArrowRight />
        </Link>
      </div>
    </article>
  );
}
