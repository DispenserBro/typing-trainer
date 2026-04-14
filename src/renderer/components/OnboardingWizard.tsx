import { useState, useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Gamepad2,
  Globe,
  Keyboard,
  Target,
} from 'lucide-react';
import type { LanguageInfo, Layout, LayoutsData } from '../../shared/types';

type OnboardingWizardProps = {
  layouts: LayoutsData;
  currentLanguage: string;
  currentLayout: string;
  onComplete: (language: string, layout: string) => void;
};

type Step = 'language' | 'layout' | 'overview' | 'done';

const STEP_ORDER: Step[] = ['language', 'layout', 'overview', 'done'];

export function OnboardingWizard({
  layouts,
  currentLanguage,
  currentLayout,
  onComplete,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>('language');
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || '');
  const [selectedLayout, setSelectedLayout] = useState(currentLayout || '');

  const languages = layouts.languages;

  const layoutsForLanguage = useMemo(() => {
    if (!selectedLanguage) return [];
    return Object.entries(layouts.layouts).filter(
      ([, layout]) => layout.lang === selectedLanguage,
    ) as [string, Layout][];
  }, [layouts.layouts, selectedLanguage]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const progressPercent = Math.round(((stepIndex + 1) / STEP_ORDER.length) * 100);

  const canProceed = (() => {
    if (step === 'language') return Boolean(selectedLanguage);
    if (step === 'layout') return Boolean(selectedLayout);
    return true;
  })();

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIndex]!);
    }
  };

  const goBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEP_ORDER[prevIndex]!);
    }
  };

  const handleLanguageSelect = (langId: string) => {
    setSelectedLanguage(langId);
    // Auto-select first layout for the language
    const firstLayout = Object.entries(layouts.layouts).find(
      ([, layout]) => layout.lang === langId,
    );
    if (firstLayout) {
      setSelectedLayout(firstLayout[0]);
    } else {
      setSelectedLayout('');
    }
  };

  const handleFinish = () => {
    onComplete(selectedLanguage, selectedLayout);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-wizard">
        <div className="onboarding-progress">
          <div className="onboarding-progress-bar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="onboarding-progress-label">
            Шаг {stepIndex + 1} из {STEP_ORDER.length}
          </span>
        </div>

        {step === 'language' && (
          <div className="onboarding-step">
            <div className="onboarding-step-icon">
              <Globe size={32} />
            </div>
            <h2>Выберите язык</h2>
            <p className="onboarding-step-desc">
              Это определит набор слов для тренировки и подходящие раскладки клавиатуры.
            </p>
            <div className="onboarding-options">
              {languages.map((lang: LanguageInfo) => (
                <button
                  key={lang.id}
                  type="button"
                  className={`onboarding-option${selectedLanguage === lang.id ? ' selected' : ''}`}
                  onClick={() => handleLanguageSelect(lang.id)}
                >
                  <span className="onboarding-option-label">{lang.label}</span>
                  {selectedLanguage === lang.id && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'layout' && (
          <div className="onboarding-step">
            <div className="onboarding-step-icon">
              <Keyboard size={32} />
            </div>
            <h2>Выберите раскладку</h2>
            <p className="onboarding-step-desc">
              Раскладка определяет расположение клавиш, пальцевые зоны и порядок обучения буквам.
            </p>
            <div className="onboarding-options">
              {layoutsForLanguage.map(([id, layout]) => (
                <button
                  key={id}
                  type="button"
                  className={`onboarding-option${selectedLayout === id ? ' selected' : ''}`}
                  onClick={() => setSelectedLayout(id)}
                >
                  <span className="onboarding-option-label">{layout.label}</span>
                  {selectedLayout === id && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'overview' && (
          <div className="onboarding-step">
            <div className="onboarding-step-icon">
              <Target size={32} />
            </div>
            <h2>Что вас ждёт</h2>
            <p className="onboarding-step-desc">
              В приложении есть несколько режимов тренировки — каждый развивает навык печати по-своему.
            </p>
            <div className="onboarding-modes">
              <div className="onboarding-mode-card">
                <Target size={22} />
                <div>
                  <h4>Практика</h4>
                  <p>Короткие адаптивные упражнения на слабые буквы, сочетания и ритм. Лучший способ начать.</p>
                </div>
              </div>
              <div className="onboarding-mode-card">
                <BookOpen size={22} />
                <div>
                  <h4>Уроки</h4>
                  <p>Пошаговое обучение раскладке от базовых рядов к полному алфавиту и связкам.</p>
                </div>
              </div>
              <div className="onboarding-mode-card">
                <Gamepad2 size={22} />
                <div>
                  <h4>Игра</h4>
                  <p>Длинные забеги с боссами, предметами и маршрутами — мотивация через прогрессию.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="onboarding-step onboarding-final">
            <div className="onboarding-step-icon onboarding-done-icon">
              <Check size={36} />
            </div>
            <h2>Всё готово!</h2>
            <p className="onboarding-step-desc">
              Настройки сохранены. Рекомендуем начать с уроков, чтобы освоить базу раскладки, или сразу перейти в практику.
            </p>
          </div>
        )}

        <div className="onboarding-actions">
          {stepIndex > 0 && step !== 'done' && (
            <button type="button" className="btn-secondary" onClick={goBack}>
              Назад
            </button>
          )}
          <div className="onboarding-actions-spacer" />
          {step !== 'done' ? (
            <button
              type="button"
              className="btn-accent"
              disabled={!canProceed}
              onClick={goNext}
            >
              Далее <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn-accent" onClick={handleFinish}>
              Начать тренировку <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
