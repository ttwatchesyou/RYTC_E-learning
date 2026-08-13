import { useMemo, useState } from "react";
import {
  HiOutlineBookOpen,
  HiOutlineMagnifyingGlass,
  HiOutlineSquares2X2,
} from "react-icons/hi2";
import AppShell from "@/components/motor-control/AppShell";
import CourseCard from "@/components/motor-control/CourseCard";
import { lessonCategories, lessons } from "@/data/motorControl";
import type { LessonCategory } from "@/types/motorControl";
import styles from "@/styles/MotorControl.module.css";

type CategoryFilter = "All Lessons" | LessonCategory;

export default function MotorControlKnowledge() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All Lessons");

  const filteredLessons = useMemo(() => {
    const search = query.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const matchesCategory = category === "All Lessons" || lesson.category === category;
      const matchesSearch = !search || `${lesson.title} ${lesson.description} ${lesson.category}`.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [category, query]);

  return (
    <AppShell title="Motor Control Knowledge | Motor Lab">
      <div className={styles.knowledgePage}>
        <section className={styles.libraryHeader}>
          <div className={styles.libraryTitle}>
            <span>COURSE LIBRARY · 28 MODULES</span>
            <h1>Motor Control Knowledge</h1>
            <p>คลังความรู้สำหรับทำความเข้าใจมอเตอร์ อุปกรณ์ควบคุม วงจรสตาร์ต ระบบป้องกัน และแนวทางแก้ปัญหาในงานจริง</p>
          </div>
          <label className={styles.searchBox}>
            <HiOutlineMagnifyingGlass />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาบทเรียน อุปกรณ์ หรือหัวข้อ..."
              aria-label="ค้นหาบทเรียน"
            />
            <span className={styles.searchShortcut}>SEARCH</span>
          </label>
        </section>

        <div className={styles.libraryMetrics}>
          <span><HiOutlineBookOpen /> <strong>{lessons.length}</strong> LESSONS</span>
          <span><HiOutlineSquares2X2 /> <strong>{lessonCategories.length - 1}</strong> CATEGORIES</span>
          <span><strong>{filteredLessons.length}</strong> RESULTS</span>
        </div>

        <div className={styles.categoryFilter} role="tablist" aria-label="Lesson categories">
          {lessonCategories.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={category === item}
              className={`${styles.categoryButton} ${category === item ? styles.categoryButtonActive : ""}`}
              onClick={() => setCategory(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        <section className={styles.courseGrid} aria-live="polite">
          {filteredLessons.map((lesson) => <CourseCard key={lesson.id} lesson={lesson} />)}
          {filteredLessons.length === 0 && (
            <div className={styles.emptyCourses}>
              <HiOutlineMagnifyingGlass />
              <div>ไม่พบบทเรียนที่ตรงกับคำค้น ลองเปลี่ยนคำหรือเลือกหมวดอื่น</div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
