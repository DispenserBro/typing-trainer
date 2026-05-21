import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import {
  AppProvider,
  useAppNavigation,
  useAppPractice,
  useAppSettings,
} from './contexts/AppContext';
import { Titlebar } from './components/Titlebar';
import { Sidebar } from './components/Sidebar';
import { Keyboard } from './components/keyboard/Keyboard';
import { OnboardingWizard } from './components/OnboardingWizard';
import {
  isModeGuideMode,
  ModeWelcomeGuide,
} from './components/onboarding/ModeWelcomeGuide';
import { PracticePage } from './pages/PracticePage';
import { SprintPage } from './pages/TestPage';
import { LessonsPage } from './pages/LessonsPage';
import { GamePage } from './pages/GamePage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HomePage } from './pages/HomePage';
import { AddonsPage } from './pages/AddonsPage';
import { SurvivalPage } from './pages/ChallengeModePage';
import { I18nProvider, useI18n } from './contexts/I18nContext';

/** Render sanitised HTML from a mod inside a sandboxed container */
function ModPage({ html }: { html: string }) {
  return (
    <section className="mode-panel active mod-page">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

/** Mod panels injected at specific locations */
function ModPanelView({ html }: { html: string }) {
  return <div className="mod-panel" dangerouslySetInnerHTML={{ __html: html }} />;
}

function AppInner() {
  const {
    ready, currentMode,
    modCssSnippets, modPanels, modModes,
  } = useAppNavigation();
  const { layouts, progress, markModeGuideSeen } = useAppPractice();
  const {
    settings,
    currentLanguage,
    currentLayout,
    saveSetting,
    setCurrentLanguage,
    setCurrentLayout,
  } = useAppSettings();
  const { t } = useI18n();
  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  // Inject mod CSS snippets into <head>
  useEffect(() => {
    if (modCssSnippets.length === 0) return;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-mod-css', 'true');
    styleEl.textContent = modCssSnippets.join('\n');
    document.head.appendChild(styleEl);
    return () => { styleEl.remove(); };
  }, [modCssSnippets]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [currentMode]);

  if (!ready) {
    return (
      <>
        <Titlebar />
        <div id="app">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', color: 'var(--subtext)',
          }}>
            {t('app.loading')}
          </div>
        </div>
      </>
    );
  }

  if (!settings.onboardingCompleted) {
    return (
      <>
        <Titlebar />
        <div id="app" className="app-onboarding">
          <OnboardingWizard
            layouts={layouts}
            currentLanguage={currentLanguage}
            currentLayout={currentLayout}
            onComplete={(language, layout) => {
              setCurrentLanguage(language);
              setCurrentLayout(layout);
              saveSetting('onboardingCompleted', true);
            }}
          />
        </div>
      </>
    );
  }

  let page: ReactElement;
  // Check for mod-registered mode first
  const modMode = currentMode.startsWith('mod:')
    ? modModes.find(m => `mod:${m.id}` === currentMode)
    : undefined;

  if (modMode) {
    page = <ModPage html={modMode.html} />;
  } else {
    switch (currentMode) {
      case 'home':     page = <HomePage />;     break;
      case 'test':     page = <SprintPage />;   break;
      case 'survival': page = <SurvivalPage />; break;
      case 'flawless': page = <SurvivalPage initialFlawless />; break;
      case 'lessons':  page = <LessonsPage />;  break;
      case 'game':     page = <GamePage />;     break;
      case 'stats':    page = <StatsPage />;    break;
      case 'settings': page = <SettingsPage />; break;
      case 'addons':   page = <AddonsPage />;   break;
      default:         page = <PracticePage />; break;
    }
  }

  const topPanels = modPanels.filter(p => p.location === 'page-top');
  const bottomPanels = modPanels.filter(p => p.location === 'page-bottom');
  const overlayPanels = modPanels.filter(p => p.location === 'overlay');
  const showKeyboard = currentMode !== 'addons';
  const modeGuideMode = isModeGuideMode(currentMode) ? currentMode : null;
  const modeGuideStatus = modeGuideMode ? progress.onboarding?.modeGuides?.[modeGuideMode] : undefined;

  return (
    <>
      <Titlebar />
      <div
        id="app"
        data-density={settings.interfaceDensity === 'default' ? undefined : settings.interfaceDensity}
        data-large-text={settings.largeText || undefined}
        data-reduced-motion={settings.reducedMotion || undefined}
        data-high-contrast={settings.highContrast || undefined}
        data-kb-pos={settings.keyboardPosition === 'bottom' ? undefined : settings.keyboardPosition}
        data-color-vision={settings.colorVisionMode === 'normal' ? undefined : settings.colorVisionMode}
        data-hide-stats={!settings.showStats || undefined}
        data-hide-text={!settings.showTextPanel || undefined}
      >
        <Sidebar />
        <main id="main-content">
          <div ref={mainScrollRef} className="main-scroll">
            {topPanels.map(p => <ModPanelView key={p.id} html={p.html} />)}
            {page}
            {bottomPanels.map(p => <ModPanelView key={p.id} html={p.html} />)}
          </div>
          {showKeyboard ? <Keyboard /> : null}
        </main>
        {modeGuideMode && !modeGuideStatus ? (
          <ModeWelcomeGuide
            mode={modeGuideMode}
            onComplete={() => markModeGuideSeen(modeGuideMode, 'completed')}
            onSkip={() => markModeGuideSeen(modeGuideMode, 'skipped')}
          />
        ) : null}
        {overlayPanels.map(p => (
          <div key={p.id} className="mod-overlay">
            <ModPanelView html={p.html} />
          </div>
        ))}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <I18nProvider>
        <AppInner />
      </I18nProvider>
    </AppProvider>
  );
}
