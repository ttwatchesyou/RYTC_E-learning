import { useMemo, useState } from "react";
import Link from "next/link";
import {
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import type { Lesson } from "@/types/motorControl";
import styles from "@/styles/MotorControl.module.css";

interface LessonSidebarProps {
  lessons: Lesson[];
  activeLessonId: string;
}

export default function LessonSidebar({ lessons, activeLessonId }: LessonSidebarProps) {
  const [query, setQuery] = useState("");
  const filteredLessons = useMemo(
    () => lessons.filter((lesson) => lesson.title.toLowerCase().includes(query.toLowerCase())),
    [lessons, query],
  );

  return (
    <aside className={styles.lessonSidebar}>
      <div className={styles.lessonSideHeader}>
        <span>COURSE CONTENT</span>
        <strong>Motor Control</strong>
        <div className={styles.sideProgressTrack}><i style={{ width: "11%" }} /></div>
        <small>3 of {lessons.length} lessons completed</small>
      </div>
      <label className={styles.sideSearch}>
        <HiOutlineMagnifyingGlass />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lessons" />
      </label>
      <div className={styles.sideSectionLabel}>ALL MODULES <HiOutlineChevronDown /></div>
      <nav className={styles.lessonList} aria-label="Lesson list">
        {filteredLessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/Motorcontrol/lesson/${lesson.id}`}
            className={`${styles.lessonListItem} ${lesson.id === activeLessonId ? styles.lessonListItemActive : ""}`}
          >
            <span className={styles.lessonListNumber}>
              {lesson.index < 3 ? <HiOutlineCheckCircle /> : String(lesson.index).padStart(2, "0")}
            </span>
            <span>
              <strong>{lesson.title}</strong>
              <small>{lesson.duration} · {lesson.level}</small>
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
