import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Coins, Heart, Maximize2, Pause, Play, Shield, Sparkles, Swords, Keyboard as KeyboardIcon, Volume2, VolumeX } from 'lucide-react';
import { useAppGame, useAppSettings, useAppUi } from '../contexts/AppContext';
import { useI18n } from '../contexts/I18nContext';
import { AdventureCanvas } from '../components/game/AdventureCanvas';
import { TextDisplay, EMPTY_ERR_POSITIONS } from '../components/TextDisplay';
import { buildPracticeContentText, getWorstChar } from '../../core/engine';
import type { AdventureAction, AdventureFeedback, AdventureRelic, AdventureRole, AdventureState } from '../../shared/types/adventure';
import { adventureRegion, adventureRoutes, adventureService, chooseAdventureReward, emptyAdventure, enterAdventureNode, playAdventureWord, RELICS, ROLES, startAdventure, upgradeAdventure } from '../../core/game/adventure';
import { filterYoKeys, filterYoWords } from '../../core/textFilters';
import '../styles/_adventure.scss';

export function AdventurePage({ onClassic }: { onClassic: () => void }) {
  const { gameState, saveGameState, allWords, layouts, getLayoutProgress, ngramModel, progress } = useAppGame();
  const { setActiveChar } = useAppUi();
  const { currentLanguage, currentLayout, settings, saveSetting } = useAppSettings();
  const unlockedKey = filterYoKeys(layouts.layouts[currentLayout]?.practiceUnlockOrder ?? [], settings.useYo)
    .slice(0, getLayoutProgress().unlocked).join('');
  const unlockedChars = useMemo(() => [...unlockedKey], [unlockedKey]);
  const words = useMemo(() => filterYoWords(allWords, settings.useYo), [allWords, settings.useYo]);
  const weakChar = getWorstChar(progress.keyStats?.[currentLayout], unlockedChars);
  const { t, locale } = useI18n();
  const state = gameState.adventure ?? emptyAdventure();
  const run = state.run;
  const current = useRef({ gameState, state, saveGameState });
  current.current = { gameState, state, saveGameState };
  const root = useRef<HTMLElement>(null), input = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(true), [role, setRole] = useState<AdventureRole>('warden');
  const [difficulty, setDifficulty] = useState<'story' | 'normal'>('normal');
  const [action, setAction] = useState<AdventureAction>('strike'), [target, setTarget] = useState(0);
  const [typed, setTyped] = useState(''), [errors, setErrors] = useState(0), [miss, setMiss] = useState(false);
  const [paused, setPaused] = useState(false), [sound, setSound] = useState(false), [unavailable, setUnavailable] = useState(false);
  const [effects, setEffects] = useState<AdventureFeedback[]>([]);
  const [confirmNew, setConfirmNew] = useState(false);
  const wordStarted = useRef(0);
  const tr = (key: string, params?: Record<string, string | number>) => t('adventure.' + key, params);
  const active = !!run && !['won', 'lost'].includes(run.phase);
  const languageMismatch = !!run && (run.language !== currentLanguage || run.layout !== currentLayout);
  // Keep one prompt for the whole turn, including action/target and display-setting changes.
  const word = useMemo(() => run && unlockedChars.length ? buildPracticeContentText({
    allWords: words,
    unlockedChars,
    weakChar,
    contentMode: 'adaptive-words',
    scenarioId: run.room === 'boss' ? 'flawless' : 'survival',
    wordCountOverride: 1,
    ngramModel: ngramModel ?? undefined,
  }) : '', [run?.seed, run?.depth, run?.words, run?.room, words, unlockedChars, weakChar, ngramModel]);
  function commit(next: AdventureState) {
    const c = current.current;
    if (next === c.state) return;
    current.current = { ...c, state: next, gameState: { ...c.gameState, adventure: next } };
    c.saveGameState(current.current.gameState);
  }
  function resetInput() { setTyped(''); setErrors(0); setMiss(false); wordStarted.current = 0; }
  function selectAction(next: AdventureAction) {
    if (paused || typed || (next === 'spell' && (run?.mana ?? 0) < 3)) return;
    setAction(next); resetInput(); input.current?.focus();
  }
  function enter(id: string) {
    if (paused || menu) return;
    const next = enterAdventureNode(current.current.state, id);
    commit(next); setAction('strike'); setTarget(0); resetInput();
  }
  useEffect(() => {
    if (!menu && !paused && run?.phase === 'battle') input.current?.focus();
  }, [menu, paused, run?.phase, run?.words, action]);
  useEffect(() => {
    const blur = () => { if (!menu) setPaused(true); wordStarted.current = 0; };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); };
  }, [menu]);
  useEffect(() => { if (paused) resetInput(); }, [paused]);
  useEffect(() => { resetInput(); }, [word, unlockedKey, words, currentLayout]);
  useEffect(() => {
    setActiveChar(!menu && !paused && !languageMismatch && run?.phase === 'battle' ? word[typed.length] : undefined);
    return () => setActiveChar(undefined);
  }, [menu, paused, languageMismatch, run?.phase, word, typed.length, setActiveChar]);
  const labels = useMemo(() => Object.fromEntries(['slime', 'wisp', 'sentinel', 'stalker', 'boss', 'attack', 'heavy', 'drain', 'ward', 'battle', 'elite', 'camp', 'shop', 'event', 'depth'].map(key => [key, t('adventure.scene.' + key)])), [t]);
  const view = useMemo(() => ({ run: menu ? null : run, target, paused: paused || menu, reducedMotion: settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches, sound, labels: { ...labels, locale } }), [run, menu, target, paused, settings.reducedMotion, sound, labels, locale]);
  const routes = run ? adventureRoutes(run) : [];
  const relicView = (id: string) => <><span className="adventure-rune">{({ ember:'✦', shell:'⬡', moss:'❧', lens:'◉', coin:'◈', fang:'ϟ', well:'◇', echo:'≋' } as Record<string,string>)[id]}</span><strong>{tr('relic.' + id)}</strong><small>{tr('relic.' + id + 'Desc')}</small></>;
  function begin() {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
    commit(startAdventure(current.current.state, role, currentLanguage, currentLayout, seed, difficulty));
    setConfirmNew(false); setMenu(false); setPaused(false); setTarget(0); setAction('strike'); resetInput();
  }
  function service(choice: string) { commit(adventureService(current.current.state, choice)); }
  return (
    <section className={"mode-panel active adventure" + (menu ? " is-menu" : " is-playing")} ref={root} data-phase={menu ? "menu" : run?.phase}>
      <header className="adventure-topbar">
        <div><span className="adventure-kicker">{tr('kicker')}</span><h1>{tr('title')}</h1></div>
        <div className="adventure-toolbar">
          {!menu && <button onClick={() => { setMenu(true); resetInput(); }} title={tr('menu')}><ArrowLeft size={17}/><span>{tr('menu')}</span></button>}
          {!menu && <button aria-pressed={paused} onClick={() => setPaused(!paused)} title={tr('pause')}>{paused ? <Play size={17}/> : <Pause size={17}/>}</button>}
          <button aria-pressed={settings.showKeyboard} onClick={() => saveSetting('showKeyboard', !settings.showKeyboard)} title={tr('keyboard')}><KeyboardIcon size={17}/></button>
          <button aria-pressed={sound} onClick={() => setSound(!sound)} title={tr('sound')}>{sound ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>
          <button title={tr('fullscreen')} onClick={() => { void (document.fullscreenElement ? document.exitFullscreen() : root.current?.closest('main')?.requestFullscreen())?.catch(() => {}); }}><Maximize2 size={17}/></button>
        </div>
      </header>
      <div className="adventure-stage">
        <AdventureCanvas view={view} effects={effects} onNode={enter} onTarget={id => { if (!paused) setTarget(id); }} onUnavailable={() => setUnavailable(true)} />
        {unavailable && <div className="adventure-render-warning" role="status">{tr('graphicsFallback')}</div>}
        {menu ? <div className="adventure-intro"><span className="adventure-kicker">{tr('storyKicker')}</span><h2>{tr('storyTitle')}</h2><p>{tr('story')}</p><div className="adventure-intro-stats"><span>{tr('best', { value: state.bestDepth })}</span><span>{tr('victories', { value: state.victories })}</span><span>✦ {state.shards} {tr('shards')}</span></div></div>
        : run && <div className="adventure-hud">
          <div className="adventure-region"><span>{tr('region.' + adventureRegion(run.depth))}</span><small>{tr('depth', { value: run.depth })}</small></div>
          <div className="adventure-vitals"><span><Heart size={16}/> {run.hp}/{run.maxHp}</span><span><Shield size={16}/> {run.shield}</span><span><Sparkles size={16}/> {run.mana}/6</span><span><Coins size={16}/> {run.gold}</span><span><Swords size={16}/> +{run.power}</span></div>
          <div className="adventure-health"><i style={{ width: run.hp / run.maxHp * 100 + '%' }}/></div>
        </div>}
        {!menu && paused && <div className="adventure-pause"><h2>{tr('paused')}</h2><p>{tr('pauseHint')}</p><button className="adventure-primary" onClick={() => setPaused(false)}>{tr('resume')}</button></div>}
      </div>
      {menu ? <div className="adventure-menu">
        {active && <div className="adventure-resume"><div><strong>{tr('savedRun')}</strong><small>{tr('depth', { value: run!.depth })} · {tr('role.' + run!.role)} · {run!.hp} HP</small></div><button className="adventure-primary" onClick={() => { setMenu(false); setPaused(false); }}>{tr('resume')}</button></div>}
        <div className="adventure-section-heading"><h2>{tr('chooseRole')}</h2><span>{tr('roleHint')}</span></div>
        <div className="adventure-role-grid">{ROLES.map(id => <button className={role === id ? 'selected' : ''} aria-pressed={role === id} key={id} onClick={() => setRole(id)}><span className="adventure-rune">{id === 'warden' ? '⬡' : id === 'mage' ? '✦' : '➶'}</span><strong>{tr('role.' + id)}</strong><p>{tr('role.' + id + 'Desc')}</p></button>)}</div>
        <div className="adventure-menu-actions"><label>{tr('difficulty')} <select value={difficulty} onChange={e => setDifficulty(e.target.value as 'normal' | 'story')}><option value="normal">{tr('normal')}</option><option value="story">{tr('storyMode')}</option></select></label><button className="adventure-primary" onClick={() => active ? setConfirmNew(true) : begin()}>{tr('begin')}</button><button onClick={onClassic}>{tr('classic')}</button></div>
        {confirmNew && <div className="adventure-confirm" role="alert"><p>{tr('replaceRun')}</p><button className="adventure-primary" onClick={begin}>{tr('begin')}</button><button onClick={() => setConfirmNew(false)}>{tr('cancel')}</button></div>}
        <div className="adventure-upgrades"><div><h3>{tr('legacyTitle')}</h3><p>{tr('legacyHint')}</p></div>{(['vitality','might'] as const).map(id => <button key={id} disabled={active || state[id] >= 5 || state.shards < 4 + state[id] * 3} onClick={() => commit(upgradeAdventure(current.current.state, id))}><strong>{tr(id)} {state[id]}/5</strong><small>{tr(id + 'Desc')} · ✦ {4 + state[id] * 3}</small></button>)}</div>
        <details className="adventure-guide"><summary>{tr('howTo')}</summary><p>{tr('instructions')}</p></details>
      </div> : run && <div className="adventure-dock" inert={paused || undefined}>
        {languageMismatch && <p className="adventure-notice">{tr('languageMismatch', { layout: run.layout })}</p>}
        {run.phase === 'battle' && <>
          {!word && <p className="adventure-notice" role="status">{tr('noUnlockedLetters')}</p>}
          <div className="adventure-battle-heading"><div><span className="adventure-kicker">{tr('battleTitle')}</span><h2>{tr('typeToAct')}</h2></div><div className="adventure-combo">{tr('combo', { value: run.combo })}<small>{tr('critHint', { value: run.relics.includes('lens') ? 3 : 5 })}</small></div></div>
          <div className="adventure-targets">{run.enemies.filter(e => e.hp > 0).map(e => <button key={e.id} className={target === e.id ? 'selected' : ''} aria-pressed={target === e.id} onClick={() => { setTarget(e.id); input.current?.focus(); }}><strong>{tr('scene.' + e.kind)} {e.enraged ? 'ϟ' : ''}</strong><span>{e.hp}/{e.maxHp} HP</span><small>{tr(e.intent === 'ward' ? 'wardIntent' : 'intent', { action: tr('scene.' + e.intent), turns: e.countdown, damage: Math.round(e.damage * (e.intent === 'heavy' ? 1.7 : 1) * (e.enraged ? 1.25 : 1) * (run.difficulty === 'story' ? .7 : 1)) })}</small></button>)}</div>
          <div className="adventure-actions">{(['strike','guard','spell'] as const).map((id,i) => <button key={id} className={action === id ? 'selected' : ''} aria-pressed={action === id} disabled={!!typed || (id === 'spell' && run.mana < 3)} onClick={() => selectAction(id)}><kbd>{i + 1}</kbd><strong>{tr('action.' + id)}</strong><small>{tr('action.' + id + 'Desc')}</small></button>)}</div>
          <div className={'adventure-typing' + (miss ? ' is-miss' : '')} onClick={() => input.current?.focus()}>
            <div className="adventure-word" aria-hidden="true"><TextDisplay text={word} pos={typed.length} errPositions={EMPTY_ERR_POSITIONS} /></div>
            <input ref={input} className="adventure-word-input" aria-label={tr('typeWord', { word })} value={typed} readOnly={languageMismatch || !word} spellCheck={false} autoComplete="off" autoCapitalize="off" onPaste={e => e.preventDefault()} onDrop={e=>e.preventDefault()} onChange={() => {}} onKeyDown={e => {
              if (paused || menu || languageMismatch || !word || e.ctrlKey || e.metaKey || e.altKey || e.isPropagationStopped() || e.nativeEvent.isComposing) return;
              if (e.key === 'Escape') { e.preventDefault(); setPaused(true); return; }
              if (['1','2','3'].includes(e.key) && !typed) { e.preventDefault(); selectAction((['strike','guard','spell'] as const)[Number(e.key)-1]!); return; }
              if (e.key === 'Backspace') { e.preventDefault(); setTyped(s=>s.slice(0,-1)); return; }
              if (e.key.length !== 1 || e.repeat) return;
              e.preventDefault();
              if (!wordStarted.current) wordStarted.current = performance.now();
              if (e.key.toLocaleLowerCase() !== word[typed.length]?.toLocaleLowerCase()) { setErrors(n=>n+1); setMiss(true); return; }
              setMiss(false);
              const next = typed + e.key;
              if (next.length === word.length) {
                const result = playAdventureWord(current.current.state, action, target, errors, Math.max(1, performance.now() - wordStarted.current));
                commit(result.state); setEffects(result.effects); resetInput();
                const alive = result.state.run?.enemies.find(enemy=>enemy.id===target && enemy.hp>0) ?? result.state.run?.enemies.find(enemy=>enemy.hp>0);
                if (alive) setTarget(alive.id);
                if (action==='spell' && (result.state.run?.mana??0)<3) setAction('strike');
              } else setTyped(next);
            }}/>
            <span className="adventure-typing-hint">{miss ? tr('miss') : tr('typingHint')}</span>
          </div>
        </>}
        {run.phase === 'map' && <>
          <div className="adventure-section-heading"><h2>{tr('routeTitle')}</h2><span>{tr('routeHint')}</span></div>
          <div className="adventure-choice-grid">{routes.map(n=><button key={n.id} onClick={()=>enter(n.id)}><span className="adventure-kicker">{tr('lane.' + n.lane)}</span><strong>{tr('scene.' + n.kind)}</strong><p>{tr('room.' + n.kind)}</p><small>{tr('nextBiome', { value: tr('region.' + adventureRegion(n.depth)) })}</small></button>)}</div>
        </>}
        {run.phase === 'reward' && <>
          <div className="adventure-section-heading"><h2>{tr('rewardTitle')}</h2><span>{tr('rewardHint')}</span></div>
          <div className="adventure-choice-grid">{run.offers.map(id=><button key={id} onClick={()=>commit(chooseAdventureReward(current.current.state,id))}>{relicView(id)}</button>)}<button onClick={()=>commit(chooseAdventureReward(current.current.state,'heal'))}><Heart/><strong>{tr('heal')}</strong><small>+25 HP</small></button><button onClick={()=>commit(chooseAdventureReward(current.current.state,'power'))}><Swords/><strong>{tr('power')}</strong><small>{tr('powerDesc')}</small></button></div>
        </>}
        {run.phase === 'camp' && <><h2>{tr('campTitle')}</h2><p>{tr('campHint')}</p><div className="adventure-choice-grid"><button onClick={()=>service('rest')}><Heart/><strong>{tr('rest')}</strong><small>+35 HP</small></button><button onClick={()=>service('train')}><Swords/><strong>{tr('train')}</strong><small>{tr('trainDesc')}</small></button></div></>}
        {run.phase === 'shop' && <><div className="adventure-section-heading"><h2>{tr('shopTitle')}</h2><button onClick={()=>service('leave')}>{tr('leave')}</button></div><div className="adventure-choice-grid">{[...run.offers,'potion','forge'].map(id=>{const cost=id==='potion'?18:id==='forge'?30:40;return <button key={id} disabled={run.purchased.includes(id)||run.gold<cost||(id==='potion'&&run.hp===run.maxHp)} onClick={()=>service(id)}>{RELICS.includes(id as AdventureRelic)?relicView(id):<><strong>{tr(id)}</strong><small>{tr(id+'Desc')}</small></>}<span>◈ {cost} {run.purchased.includes(id)?'✓':''}</span></button>;})}</div></>}
        {run.phase === 'event' && <><span className="adventure-kicker">{tr('eventKicker')}</span><h2>{tr('event.' + run.encounter)}</h2><p>{tr('event.' + run.encounter + 'Desc')}</p><div className="adventure-choice-grid"><button onClick={()=>service('safe')}><strong>{tr('safe')}</strong><small>+12 HP · +8 ◈</small></button><button disabled={run.hp<=15} onClick={()=>service('risk')}><strong>{tr('risk')}</strong><small>{tr('riskDesc')}</small></button><button disabled={run.gold<20} onClick={()=>service('blessing')}><strong>{tr('blessing')}</strong><small>{tr('blessingDesc')}</small></button></div></>}
        {['won','lost'].includes(run.phase) && <div className="adventure-ending"><span className="adventure-rune">{run.phase==='won'?'✦':'◇'}</span><h2>{tr(run.phase==='won'?'won':'lost')}</h2><p>{tr(run.phase==='won'?'wonDesc':'lostDesc')}</p><div><span>{tr('depth',{value:run.depth})}</span><span>{tr('words',{value:run.words})}</span><span>{tr('combo',{value:run.bestCombo})}</span></div><button className="adventure-primary" onClick={()=>setMenu(true)}>{tr('returnCamp')}</button></div>}
        {!!run.relics.length && <div className="adventure-relics"><span>{tr('relics')}</span>{run.relics.map(id=><span key={id} title={tr('relic.'+id+'Desc')}>{tr('relic.'+id)}</span>)}</div>}
        <footer className="adventure-footnote">{tr('autosave')} · {tr('seed',{value:run.seed})}</footer>
      </div>}
    </section>
  );
}
