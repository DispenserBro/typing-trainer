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
import { useI18n } from '../contexts/I18nContext';
import { Button } from './ui/Button';

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
  const { t } = useI18n();
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
            {t('onboarding.firstRun.stepProgress', { current: stepIndex + 1, total: STEP_ORDER.length })}
          </span>
        </div>

        {step === 'language' && (
          <div className="onboarding-step">
            <div className="onboarding-step-icon">
              <Globe size={32} />
            </div>
            <h2>{t('onboarding.firstRun.language.title')}</h2>
            <p className="onboarding-step-desc">
              {t('onboarding.firstRun.language.description')}
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
            <h2>{t('onboarding.firstRun.layout.title')}</h2>
            <p className="onboarding-step-desc">
              {t('onboarding.firstRun.layout.description')}
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
            <h2>{t('onboarding.firstRun.overview.title')}</h2>
            <p className="onboarding-step-desc">
              {t('onboarding.firstRun.overview.description')}
            </p>
            <div className="onboarding-modes">
              <div className="onboarding-mode-card">
                <Target size={22} />
                <div>
                  <h4>{t('onboarding.firstRun.overview.practice.title')}</h4>
                  <p>{t('onboarding.firstRun.overview.practice.description')}</p>
                </div>
              </div>
              <div className="onboarding-mode-card">
                <BookOpen size={22} />
                <div>
                  <h4>{t('onboarding.firstRun.overview.lessons.title')}</h4>
                  <p>{t('onboarding.firstRun.overview.lessons.description')}</p>
                </div>
              </div>
              <div className="onboarding-mode-card">
                <Gamepad2 size={22} />
                <div>
                  <h4>{t('onboarding.firstRun.overview.game.title')}</h4>
                  <p>{t('onboarding.firstRun.overview.game.description')}</p>
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
            <h2>{t('onboarding.firstRun.done.title')}</h2>
            <p className="onboarding-step-desc">
              {t('onboarding.firstRun.done.description')}
            </p>
          </div>
        )}

        <div className="onboarding-actions">
          {stepIndex > 0 && step !== 'done' && (
            <Button onClick={goBack}>
              {t('common.actions.back')}
            </Button>
          )}
          <div className="onboarding-actions-spacer" />
          {step !== 'done' ? (
            <Button
              variant="accent"
              disabled={!canProceed}
              onClick={goNext}
            >
              {t('common.actions.next')} <ArrowRight size={16} />
            </Button>
          ) : (
            <Button variant="accent" onClick={handleFinish}>
              {t('onboarding.firstRun.startTraining')} <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
