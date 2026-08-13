import type { GetStaticPaths, GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineClock,
  HiOutlinePhoto,
} from "react-icons/hi2";
import { TbCircuitSwitchOpen } from "react-icons/tb";
import AppShell from "@/components/motor-control/AppShell";
import LessonSidebar from "@/components/motor-control/LessonSidebar";
import { lessons } from "@/data/motorControl";
import type { Lesson } from "@/types/motorControl";
import styles from "@/styles/MotorControl.module.css";

interface LessonPageProps {
  lesson: Lesson;
  previousLesson: Lesson | null;
  nextLesson: Lesson | null;
}

const lessonVisualFiles = [
  "01-motor-control-basics.png",
  "02-electrical-fundamentals.png",
  "03-ac-motor.png",
  "04-dc-motor.png",
  "05-servo-motor.png",
  "06-stepper-motor.png",
  "07-contactor.png",
  "08-overload-relay.png",
  "09-circuit-breaker.png",
  "10-fuse.png",
  "11-push-button.png",
  "12-selector-switch.png",
  "13-relay.png",
  "14-limit-switch.png",
  "15-sensor.png",
  "16-dol.png",
  "17-forward-reverse.png",
  "18-star-delta.png",
  "19-soft-starter.png",
  "20-vfd.png",
  "21-motor-speed-control.png",
  "22-motor-protection.png",
  "23-control-circuit.png",
  "24-power-circuit.png",
  "25-electrical-symbols.png",
  "26-wiring-diagram.png",
  "27-motor-troubleshooting.png",
  "28-motor-control-safety.png",
] as const;

export default function LessonPage({ lesson, previousLesson, nextLesson }: LessonPageProps) {
  const lessonVisualFile = lessonVisualFiles[lesson.index - 1];

  return (
    <AppShell title={`${lesson.title} | Motor Control Knowledge`} fullWidth>
      <div className={styles.lessonPage}>
        <LessonSidebar lessons={lessons} activeLessonId={lesson.id} />

        <div className={styles.lessonMain}>
          <div className={styles.lessonTopbar}>
            <div>
              <strong>Motor Control Basics</strong>
              <span>·</span>
              <span>{lesson.index} / {lessons.length} Lessons</span>
            </div>
            <div>
              <span>{Math.round((lesson.index / lessons.length) * 100)}%</span>
              <span className={styles.lessonTopbarProgress}>
                <i style={{ width: `${(lesson.index / lessons.length) * 100}%` }} />
              </span>
            </div>
          </div>

          <article className={styles.lessonArticle}>
            <div className={styles.lessonBreadcrumb}>
              <span>{lesson.category}</span><HiOutlineArrowRight /><span>Lesson {String(lesson.index).padStart(2, "0")}</span>
            </div>
            <h1>{lesson.title}</h1>
            <p className={styles.lessonLead}>{lesson.description}</p>
            <div className={styles.lessonTagRow}>
              <span>{lesson.level}</span>
              <span><HiOutlineClock /> {lesson.duration}</span>
              <span>{lesson.category}</span>
            </div>

            {lessonVisualFile && (
              <figure className={styles.lessonVisual}>
                <Image
                  src={`/images/motor-control/lessons/${lessonVisualFile}`}
                  alt={`ภาพสามมิติประกอบบทเรียน ${lesson.title}`}
                  width={1536}
                  height={1024}
                  priority
                  sizes="(max-width: 680px) calc(100vw - 28px), (max-width: 1100px) calc(100vw - 278px), 900px"
                />
                <figcaption>
                  <span>3D LESSON VISUAL</span>
                  <strong>{lesson.title}</strong>
                  <small>ภาพสามมิติประกอบเนื้อหาของบทเรียน</small>
                </figcaption>
              </figure>
            )}

            {lesson.content.map((section, index) => (
              <section className={styles.lessonSection} key={section.title} id={section.title.toLowerCase().replace(/\s/g, "-")}>
                <span className={styles.sectionIndex}>{String(index + 1).padStart(2, "0")}</span>
                <h2>{section.title}</h2>
                {section.title === "Quiz" ? (
                  <div className={styles.quizBox}>
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                ) : (
                  section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                )}
                {section.bullets && (
                  <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                )}
                {section.title === "Circuit Diagram" && (
                  <div className={styles.diagramPlaceholder}>
                    <div>
                      <TbCircuitSwitchOpen />
                      DIAGRAM READY AREA<br />
                      <small>รองรับ Schematic / Wiring Diagram / Equipment Image</small>
                    </div>
                  </div>
                )}
              </section>
            ))}

            <nav className={styles.lessonPagination} aria-label="Lesson pagination">
              {previousLesson ? (
                <Link className={styles.lessonNavCard} href={`/Motorcontrol/lesson/${previousLesson.id}`}>
                  <HiOutlineArrowLeft />
                  <span><small>PREVIOUS LESSON</small><strong>{previousLesson.title}</strong></span>
                </Link>
              ) : <span />}
              {nextLesson && (
                <Link className={styles.lessonNavCard} href={`/Motorcontrol/lesson/${nextLesson.id}`}>
                  <span><small>NEXT LESSON</small><strong>{nextLesson.title}</strong></span>
                  <HiOutlineArrowRight />
                </Link>
              )}
            </nav>
          </article>
        </div>
      </div>
    </AppShell>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: lessons.map((lesson) => ({ params: { id: lesson.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<LessonPageProps> = async ({ params }) => {
  const lesson = lessons.find((item) => item.id === params?.id) as Lesson;
  const previousLesson = lesson.previousLesson
    ? lessons.find((item) => item.id === lesson.previousLesson) || null
    : null;
  const nextLesson = lesson.nextLesson
    ? lessons.find((item) => item.id === lesson.nextLesson) || null
    : null;

  // Next.js 13.1 rejects nested `undefined` values during static serialization.
  // JSON serialization omits optional navigation keys while keeping the data model reusable.
  const props = JSON.parse(JSON.stringify({ lesson, previousLesson, nextLesson })) as LessonPageProps;
  return { props };
};
