import {
  createContext, useContext, useState, useCallback, useEffect, useRef, useMemo,
  type ReactNode,
} from 'react';
import type {
  LayoutsData, Layout, Progress, CustomThemes, Session, CharStat,
  UserSettings, PracticeSettings, PracticeState, SpeedUnit,
  DailyGoalType, TextDisplayMode, LanguageInfo,
} from '../../shared/types';
import {
  createSession, generateText,
  generatePracticeText, formatSpeed, speedLabel, getWorstChar,
} from '../engine';

/* ════════════════════════════════════════════════════════
   Built-in themes
   ════════════════════════════════════════════════════════ */
export const BUILT_IN_THEMES = ['dark-orange', 'catppuccin', 'nord', 'monokai', 'light'];

/* ════════════════════════════════════════════════════════
   Defaults
   ════════════════════════════════════════════════════════ */
function defaultSettings(s?: Partial<UserSettings>): UserSettings {
  return {
    speedUnit: s?.speedUnit ?? 'cpm',
    cursorStyle: s?.cursorStyle ?? 'underline',
    cursorSmooth: s?.cursorSmooth ?? 'smooth',
    theme: s?.theme ?? 'dark-orange',
    language: s?.language ?? '',
    layout: s?.layout ?? '',
    useYo: s?.useYo ?? false,
    showKeyboard: s?.showKeyboard ?? true,
  };
}

function defaultPracticeSettings(p?: Partial<PracticeSettings>): PracticeSettings {
  return {
    dailyGoalType: p?.dailyGoalType ?? 'minutes',
    dailyGoalValue: p?.dailyGoalValue ?? 15,
    noStepBack: p?.noStepBack ?? false,
    textDisplay: p?.textDisplay ?? 'block',
  };
}

function getPracticeState(progress: Progress, layout: string): PracticeState {
  if (!progress.practice) progress.practice = {};
  if (!progress.practice[layout]) {
    progress.practice[layout] = {
      unlocked: 2, worstChar: null,
      sessionsToday: 0, minutesToday: 0, lastDate: '',
    };
  }
  const ps = progress.practice[layout];
  if (typeof ps.unlocked !== 'number' || isNaN(ps.unlocked)) ps.unlocked = 2;
  if (typeof ps.minutesToday !== 'number') ps.minutesToday = 0;
  const today = new Date().toISOString().slice(0, 10);
  if (ps.lastDate !== today) {
    ps.sessionsToday = 0;
    ps.minutesToday = 0;
    ps.lastDate = today;
  }
  return ps;
}

/* ════════════════════════════════════════════════════════
   Context value interface
   ════════════════════════════════════════════════════════ */
export interface AppContextValue {
  /* Data */
  ready: boolean;
  layouts: LayoutsData;
  allWords: string[];
  progress: Progress;
  customThemes: CustomThemes;

  /* Derived */
  settings: UserSettings;
  practiceSettings: PracticeSettings;
  currentLayout: string;
  currentLanguage: string;
  currentMode: string;

  /* Language helpers */
  languages: LanguageInfo[];
  layoutsForLanguage: [string, Layout][];  // filtered by currentLanguage

  /* Session */
  session: Session;
  setSession: (s: Session) => void;
  activeChar: string | undefined;
  setActiveChar: (ch: string | undefined) => void;

  /* Actions */
  switchMode: (mode: string) => void;
  setCurrentLayout: (layout: string) => void;
  setCurrentLanguage: (lang: string) => void;
  saveSetting: <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => void;
  savePracticeSetting: <K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => void;
  saveProgress: (p: Progress) => void;
  saveCustomThemes: (t: CustomThemes) => void;
  applyTheme: (name: string) => void;
  reloadWords: () => Promise<void>;

  /* Helpers */
  fmtSpeed: (wpm: number) => string;
  spdLabel: string;
  getPracticeState: () => PracticeState;
  saveCharStats: (cs: Record<string, CharStat>) => void;
  saveHistory: (mode: 'test' | 'lesson' | 'practice', wpm: number, acc: number) => void;
}

const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);

/* ════════════════════════════════════════════════════════
   Provider
   ════════════════════════════════════════════════════════ */
export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [layouts, setLayouts] = useState<LayoutsData>({ languages: [], layouts: {} });
  const [allWords, setAllWords] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [customThemes, setCustomThemes] = useState<CustomThemes>({});
  const [currentLayout, setCurrentLayoutState] = useState('');
  const [currentLanguage, setCurrentLanguageState] = useState('');
  const [currentMode, setCurrentMode] = useState('practice');
  const [session, setSession] = useState<Session>(createSession('', '', -1));
  const [activeChar, setActiveChar] = useState<string | undefined>(undefined);

  const progressRef = useRef(progress);
  progressRef.current = progress;

  /* ── Derived ────────────────────────────────────────── */
  const settings = defaultSettings(progress.settings);
  const practiceSettings = defaultPracticeSettings(progress.practiceSettings);

  /* ── Computed: layouts filtered by current language ── */
  const layoutsForLanguage = useMemo<[string, Layout][]>(() => {
    if (!currentLanguage) return [];
    return Object.entries(layouts.layouts)
      .filter(([, lay]) => lay.lang === currentLanguage);
  }, [layouts.layouts, currentLanguage]);

  const languages = layouts.languages ?? [];

  /* ── Init ───────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const [lay, prog, ct] = await Promise.all([
        window.api.getLayouts(),
        window.api.getProgress(),
        window.api.getCustomThemes(),
      ]);
      setLayouts(lay);
      setProgress(prog);
      setCustomThemes(ct);

      const s = defaultSettings(prog.settings);

      // Determine language
      let lang = s.language;
      if (!lang || !(lay.languages ?? []).some((l: LanguageInfo) => l.id === lang)) {
        lang = lay.languages?.[0]?.id ?? 'en';
      }
      setCurrentLanguageState(lang);

      // Determine layout (must match language)
      let layoutId = s.layout;
      const compatibleLayouts = Object.entries(lay.layouts)
        .filter(([, l]) => l.lang === lang);
      if (!layoutId || !lay.layouts[layoutId] || lay.layouts[layoutId].lang !== lang) {
        layoutId = compatibleLayouts[0]?.[0] ?? Object.keys(lay.layouts)[0] ?? '';
      }
      setCurrentLayoutState(layoutId);

      // Load words by language
      const words = await window.api.getWords(lang);
      setAllWords(words);

      // Apply saved theme
      const theme = s.theme ?? 'dark-orange';
      applyThemeDOM(theme, ct);

      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Theme application ──────────────────────────────── */
  const applyThemeDOM = useCallback((name: string, ct?: CustomThemes) => {
    const themes = ct ?? customThemes;
    if (BUILT_IN_THEMES.includes(name)) {
      document.body.setAttribute('data-theme', name);
      const root = document.documentElement.style;
      ['--bg','--surface','--surface2','--surface3','--text','--text-dim','--subtext',
       '--accent','--accent-hover','--accent-dim','--green','--red','--yellow']
        .forEach(v => root.removeProperty(v));
    } else if (themes[name]) {
      document.body.setAttribute('data-theme', 'custom');
      const c = themes[name];
      const root = document.documentElement.style;
      root.setProperty('--bg', c.bg);
      root.setProperty('--surface', c.surface);
      root.setProperty('--surface2', c.surface2);
      root.setProperty('--text', c.text);
      root.setProperty('--subtext', c.subtext);
      root.setProperty('--accent', c.accent);
      root.setProperty('--green', c.green);
      root.setProperty('--red', c.red);
      root.setProperty('--yellow', c.yellow);
    }
  }, [customThemes]);

  const applyTheme = useCallback((name: string) => {
    applyThemeDOM(name);
  }, [applyThemeDOM]);

  /* ── Mode switching ─────────────────────────────────── */
  const switchMode = useCallback((mode: string) => {
    setCurrentMode(mode);
    setSession(prev => {
      if (prev.active && prev.timer) clearInterval(prev.timer);
      return { ...prev, active: false, timer: null };
    });
  }, []);

  /* ── Layout change ──────────────────────────────────── */
  const setCurrentLayout = useCallback((layout: string) => {
    setCurrentLayoutState(layout);
    setProgress(prev => {
      const next = { ...prev, settings: { ...defaultSettings(prev.settings), layout } };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  /* ── Language change ────────────────────────────────── */
  const setCurrentLanguage = useCallback((lang: string) => {
    setCurrentLanguageState(lang);
    // Auto-select first compatible layout
    const compatible = Object.entries(layouts.layouts)
      .filter(([, l]) => l.lang === lang);
    const newLayout = compatible[0]?.[0] ?? '';
    setCurrentLayoutState(newLayout);
    setProgress(prev => {
      const next = {
        ...prev,
        settings: { ...defaultSettings(prev.settings), language: lang, layout: newLayout },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, [layouts.layouts]);

  /* ── Reload words for current language ──────────────── */
  const reloadWords = useCallback(async () => {
    const words = await window.api.getWords(currentLanguage);
    setAllWords(words);
  }, [currentLanguage]);

  // Auto-reload words when language changes
  useEffect(() => {
    if (ready && currentLanguage) {
      reloadWords();
    }
  }, [ready, currentLanguage, reloadWords]);

  /* ── Settings persistence ───────────────────────────── */
  const saveSetting = useCallback(<K extends keyof UserSettings>(key: K, val: UserSettings[K]) => {
    setProgress(prev => {
      const next = {
        ...prev,
        settings: { ...defaultSettings(prev.settings), [key]: val },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const savePracticeSetting = useCallback(<K extends keyof PracticeSettings>(key: K, val: PracticeSettings[K]) => {
    setProgress(prev => {
      const next = {
        ...prev,
        practiceSettings: { ...defaultPracticeSettings(prev.practiceSettings), [key]: val },
      };
      window.api.saveProgress(next);
      return next;
    });
  }, []);

  const saveProgressCb = useCallback((p: Progress) => {
    setProgress(p);
    window.api.saveProgress(p);
  }, []);

  const saveCustomThemesCb = useCallback((t: CustomThemes) => {
    setCustomThemes(t);
    window.api.saveCustomThemes(t);
  }, []);

  /* ── Char stats persistence ─────────────────────────── */
  const saveCharStats = useCallback((cs: Record<string, CharStat>) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.keyStats) next.keyStats = {};
      if (!next.keyStats[currentLayout]) next.keyStats[currentLayout] = {};
      const ks = next.keyStats[currentLayout];
      for (const [ch, data] of Object.entries(cs)) {
        if (!ks[ch]) ks[ch] = { hits: 0, misses: 0, totalTime: 0 };
        ks[ch].hits += data.hits;
        ks[ch].misses += data.misses;
        ks[ch].totalTime += data.totalTime;
      }
      window.api.saveProgress(next);
      return { ...next };
    });
  }, [currentLayout]);

  const saveHistory = useCallback((mode: 'test' | 'lesson' | 'practice', wpm: number, acc: number) => {
    setProgress(prev => {
      const next = { ...prev };
      if (!next.history) next.history = {};
      if (!next.history[currentLayout]) next.history[currentLayout] = [];
      next.history[currentLayout].push({
        date: new Date().toISOString(),
        mode,
        wpm: Math.round(wpm),
        acc: Math.round(acc * 10) / 10,
      });
      if (next.history[currentLayout].length > 500) {
        next.history[currentLayout] = next.history[currentLayout].slice(-500);
      }
      window.api.saveProgress(next);
      return { ...next };
    });
  }, [currentLayout]);

  /* ── Helpers ────────────────────────────────────────── */
  const fmtSpeed = useCallback((wpm: number) => formatSpeed(wpm, settings.speedUnit), [settings.speedUnit]);
  const spdLabel = speedLabel(settings.speedUnit);

  const getPracticeStateCb = useCallback(() => {
    return getPracticeState(progressRef.current, currentLayout);
  }, [currentLayout]);

  const value: AppContextValue = {
    ready, layouts, allWords, progress, customThemes,
    settings, practiceSettings, currentLayout, currentLanguage, currentMode,
    languages, layoutsForLanguage,
    session, setSession, activeChar, setActiveChar,
    switchMode, setCurrentLayout, setCurrentLanguage,
    saveSetting, savePracticeSetting, saveProgress: saveProgressCb,
    saveCustomThemes: saveCustomThemesCb,
    applyTheme, reloadWords,
    fmtSpeed, spdLabel, getPracticeState: getPracticeStateCb,
    saveCharStats, saveHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
