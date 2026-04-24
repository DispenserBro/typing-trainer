import { Fragment, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, Play } from 'lucide-react';
import type { Lesson } from '../../../shared/types';
import { useI18n } from '../../contexts/I18nContext';
import { PageHeader } from '../ui/PageHeader';

type LessonsListViewProps = {
  lessons: Lesson[];
  lessonsDone: Record<number, number>;
  collapsedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  onOpenLesson: (index: number) => void;
  sectionLabel: (section?: string) => string;
  lessonFocusLabel: (lesson: Lesson | null, fallbackKeys?: string[]) => string;
  resolveLessonAtIndex: (index: number) => Lesson | null;
  getSectionUnlockState: (lessonIndex: number) => boolean;
  exerciseCount: number;
  /** Дополнительный элемент справа в заголовке (например, кнопка достижений). */
  headerRight?: ReactNode;
};

export function LessonsListView({
  lessons,
  lessonsDone,
  collapsedSections,
  onToggleSection,
  onOpenLesson,
  sectionLabel,
  lessonFocusLabel,
  resolveLessonAtIndex,
  getSectionUnlockState,
  exerciseCount,
  headerRight,
}: LessonsListViewProps) {
  const { t } = useI18n();
  return (
    <section className="mode-panel active">
      <PageHeader title={t('lessons.title')} inlineActions={headerRight} />
      <div className="lesson-grid">
        {lessons.map((lesson, idx) => {
          const done = lessonsDone[idx] ?? 0;
          const allDone = done >= exerciseCount;
          const resolvedLesson = resolveLessonAtIndex(idx);
          const keys = resolvedLesson?.keys ?? [];
          const currentSection = sectionLabel(lesson.section);
          const prevSection = idx > 0 ? sectionLabel(lessons[idx - 1]?.section) : null;
          const showSection = idx === 0 || prevSection !== currentSection;
          const isCollapsed = !!collapsedSections[currentSection];
          const unlocked = getSectionUnlockState(idx);

          return (
            <Fragment key={lesson.id}>
              {showSection && (
                <button
                  type="button"
                  className={`lesson-section-title${isCollapsed ? ' collapsed' : ''}`}
                  onClick={() => onToggleSection(currentSection)}
                >
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span>{currentSection}</span>
                </button>
              )}
              {!isCollapsed && (
                <div
                  className={`lesson-card${allDone ? ' completed' : ''}${!unlocked ? ' locked' : ''}`}
                  onClick={() => unlocked && onOpenLesson(idx)}
                >
                  <div className="lesson-card-top">
                    <span className="lesson-num">{idx + 1}</span>
                    <span className="lesson-name">{lesson.name}</span>
                  </div>
                  {lesson.description && <span className="lesson-desc">{lesson.description}</span>}
                  <span className="lesson-keys">{lessonFocusLabel(resolvedLesson, keys)}</span>
                  {!unlocked && (
                    <span className="lesson-locked-note">
                      {t('lessons.lockedNote')}
                    </span>
                  )}
                  <div className="lesson-progress-bar">
                    {Array.from({ length: exerciseCount }, (_, j) => (
                      <div key={j} className={`progress-segment ${j < done ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
