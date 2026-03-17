import type { ReactElement } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Titlebar } from './components/Titlebar';
import { Sidebar } from './components/Sidebar';
import { Keyboard } from './components/Keyboard';
import { PracticePage } from './pages/PracticePage';
import { TestPage } from './pages/TestPage';
import { LessonsPage } from './pages/LessonsPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';

function AppInner() {
  const { ready, currentMode } = useApp();

  if (!ready) {
    return (
      <>
        <Titlebar />
        <div id="app">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', color: 'var(--subtext)',
          }}>
            Загрузка…
          </div>
        </div>
      </>
    );
  }

  let page: ReactElement;
  switch (currentMode) {
    case 'test':     page = <TestPage />;     break;
    case 'lessons':  page = <LessonsPage />;  break;
    case 'stats':    page = <StatsPage />;    break;
    case 'settings': page = <SettingsPage />; break;
    default:         page = <PracticePage />; break;
  }

  return (
    <>
      <Titlebar />
      <div id="app">
        <Sidebar />
        <main id="main-content">
          <div className="main-scroll">
            {page}
          </div>
          <Keyboard />
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
