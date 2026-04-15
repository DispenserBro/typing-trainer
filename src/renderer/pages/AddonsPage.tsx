import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Puzzle, Wrench, Upload, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Package, Link2Off } from 'lucide-react';
import type { InstalledAddon, ModPermission } from '../../shared/types/addon';
import type { InstalledMod } from '../../shared/types/addon';

type Tab = 'addons' | 'mods';

/* ── Addon helpers ──────────────────────────────────────── */

function resourceTags(addon: InstalledAddon): string[] {
  const r = addon.manifest.resources;
  if (!r) return [];
  const tags: string[] = [];
  if (r.words?.length) tags.push('Слова');
  if (r.lessons?.length) tags.push('Уроки');
  if (r.layouts?.length) tags.push('Раскладки');
  if (r.languages?.length) tags.push('Языки');
  if (r.items?.items?.length) tags.push('Предметы');
  if (r.achievements?.achievements?.length) tags.push('Достижения');
  if (r.themes && Object.keys(r.themes.themes).length) tags.push('Темы');
  if (r.practicePacks?.packs?.length) tags.push('Контент-паки');
  return tags;
}

/* ── Mod helpers ────────────────────────────────────────── */

function modPermissionLabels(mod: InstalledMod): string[] {
  const map: Record<string, string> = {
    sections: 'Управление разделами',
    settings: 'Переопределение настроек',
    items: 'Управление предметами',
    achievements: 'Управление достижениями',
    rules: 'Изменение правил',
    ui: 'Пользовательский UI',
    events: 'Подписка на события',
    words: 'Управление словами',
    lessons: 'Управление уроками',
    modes: 'Новые режимы',
  };
  return (mod.manifest.permissions ?? []).map((p: ModPermission) => map[p] ?? p);
}

/* ── Addon Card ─────────────────────────────────────────── */

function AddonCard({
  addon,
  missingDeps,
  onToggle,
  onRemove,
}: {
  addon: InstalledAddon;
  missingDeps: string[];
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const m = addon.manifest;
  const tags = resourceTags(addon);
  const hasMissing = missingDeps.length > 0;

  return (
    <div className={`addon-card${addon.enabled ? '' : ' addon-card--disabled'}${hasMissing ? ' addon-card--blocked' : ''}`}>
      <div className="addon-card__icon">
        <Package size={24} />
      </div>
      <div className="addon-card__body">
        <div className="addon-card__header">
          <span className="addon-card__name">{m.name}</span>
          <span className="addon-card__version">v{m.version}</span>
          {m.author && <span className="addon-card__author">— {m.author}</span>}
        </div>
        {m.description && (
          <p className="addon-card__desc">{m.description}</p>
        )}
        {tags.length > 0 && (
          <div className="addon-card__tags">
            {tags.map(t => <span key={t} className="addon-card__tag">{t}</span>)}
          </div>
        )}
        {hasMissing && (
          <div className="addon-card__deps-warn">
            <Link2Off size={13} />
            <span>Не хватает модов: {missingDeps.join(', ')}</span>
          </div>
        )}
      </div>
      <div className="addon-card__actions">
        <button
          className="addon-card__toggle"
          title={hasMissing ? 'Установите необходимые моды' : addon.enabled ? 'Отключить' : 'Включить'}
          disabled={hasMissing}
          onClick={() => !hasMissing && onToggle(addon.id, !addon.enabled)}
        >
          {addon.enabled && !hasMissing
            ? <ToggleRight size={28} className="addon-toggle--on" />
            : <ToggleLeft size={28} className="addon-toggle--off" />}
        </button>
        <button
          className="addon-card__remove"
          title="Удалить"
          onClick={() => onRemove(addon.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Mod Card ───────────────────────────────────────────── */

function ModCard({
  mod,
  missingDeps,
  onToggle,
  onRemove,
}: {
  mod: InstalledMod;
  missingDeps: string[];
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const m = mod.manifest;
  const perms = modPermissionLabels(mod);
  const hasMissing = missingDeps.length > 0;

  return (
    <div className={`addon-card${mod.enabled ? '' : ' addon-card--disabled'}${hasMissing ? ' addon-card--blocked' : ''}`}>
      <div className="addon-card__icon">
        <Wrench size={24} />
      </div>
      <div className="addon-card__body">
        <div className="addon-card__header">
          <span className="addon-card__name">{m.name}</span>
          <span className="addon-card__version">v{m.version}</span>
          {m.author && <span className="addon-card__author">— {m.author}</span>}
        </div>
        {m.description && (
          <p className="addon-card__desc">{m.description}</p>
        )}
        {perms.length > 0 && (
          <div className="addon-card__tags">
            {perms.map(p => <span key={p} className="addon-card__tag addon-card__tag--perm">{p}</span>)}
          </div>
        )}
        {hasMissing && (
          <div className="addon-card__deps-warn">
            <Link2Off size={13} />
            <span>Не хватает модов: {missingDeps.join(', ')}</span>
          </div>
        )}
        <div className="addon-card__mod-warn">
          <AlertTriangle size={13} />
          <span>Выполняет JS-скрипт · точка входа: <code>{m.entry}</code></span>
        </div>
      </div>
      <div className="addon-card__actions">
        <button
          className="addon-card__toggle"
          title={hasMissing ? 'Установите необходимые моды' : mod.enabled ? 'Отключить' : 'Включить'}
          disabled={hasMissing}
          onClick={() => !hasMissing && onToggle(mod.id, !mod.enabled)}
        >
          {mod.enabled && !hasMissing
            ? <ToggleRight size={28} className="addon-toggle--on" />
            : <ToggleLeft size={28} className="addon-toggle--off" />}
        </button>
        <button
          className="addon-card__remove"
          title="Удалить"
          onClick={() => onRemove(mod.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export function AddonsPage() {
  const {
    installedAddons, installAddon, removeAddon, toggleAddon,
    installedMods, installMod, removeMod, toggleMod,
  } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('addons');
  const [search, setSearch] = useState('');

  const filteredAddons = search.trim()
    ? installedAddons.filter(a =>
        a.manifest.name.toLowerCase().includes(search.toLowerCase())
        || (a.manifest.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : installedAddons;

  const filteredMods = search.trim()
    ? installedMods.filter(m =>
        m.manifest.name.toLowerCase().includes(search.toLowerCase())
        || (m.manifest.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : installedMods;

  /* Set of enabled mod IDs for dependency resolution */
  const enabledModIds = useMemo(
    () => new Set(installedMods.filter(m => m.enabled).map(m => m.id)),
    [installedMods],
  );

  /** Returns list of missing dependency IDs for a given manifest */
  const getMissingDeps = (deps: string[] | undefined): string[] => {
    if (!deps || deps.length === 0) return [];
    return deps.filter(d => !enabledModIds.has(d));
  };

  const handleInstallAddon = async () => {
    const result = await installAddon();
    if (!result.ok && result.error) alert(`Ошибка установки аддона: ${result.error}`);
  };

  const handleInstallMod = async () => {
    const result = await installMod();
    if (!result.ok && result.error) alert(`Ошибка установки мода: ${result.error}`);
  };

  const handleRemoveAddon = async (id: string) => {
    const name = installedAddons.find(a => a.id === id)?.manifest.name ?? id;
    if (!confirm(`Удалить аддон «${name}»?`)) return;
    await removeAddon(id);
  };

  const handleRemoveMod = async (id: string) => {
    const name = installedMods.find(m => m.id === id)?.manifest.name ?? id;
    if (!confirm(`Удалить мод «${name}»?`)) return;
    await removeMod(id);
  };

  return (
    <section className="mode-panel active addons-page">
      <div className="panel-header">
        <h1>Аддоны и модификации</h1>
      </div>

      <div className="addons-toolbar">
        <div className="addons-tabs">
          <button
            className={`addons-tab${activeTab === 'addons' ? ' addons-tab--active' : ''}`}
            onClick={() => setActiveTab('addons')}
          >
            <Puzzle size={16} />
            <span>Аддоны</span>
            {installedAddons.length > 0 && <span className="addons-tab__count">{installedAddons.length}</span>}
          </button>
          <button
            className={`addons-tab${activeTab === 'mods' ? ' addons-tab--active' : ''}`}
            onClick={() => setActiveTab('mods')}
          >
            <Wrench size={16} />
            <span>Модификации</span>
            {installedMods.length > 0 && <span className="addons-tab__count">{installedMods.length}</span>}
          </button>
        </div>
        <div className="addons-toolbar__right">
          <input
            className="addons-search"
            type="text"
            placeholder="Поиск…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {activeTab === 'addons' ? (
            <button className="btn-primary btn-sm" onClick={handleInstallAddon}>
              <Upload size={14} />
              <span>Установить аддон…</span>
            </button>
          ) : (
            <button className="btn-primary btn-sm" onClick={handleInstallMod}>
              <Upload size={14} />
              <span>Установить мод…</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'addons' && (
        <>
          <p className="addons-page__hint">
            Аддоны — это JSON-файлы, которые добавляют контент: словари, уроки, раскладки,
            предметы, достижения и темы. Они не содержат скриптов и не изменяют механики приложения.
          </p>
          {filteredAddons.length === 0 ? (
            <div className="addons-empty">
              <div className="addons-empty__icon"><Puzzle size={48} /></div>
              <p>{search ? 'Ничего не найдено' : 'Нет установленных аддонов.'}</p>
              <p className="addons-empty__sub">Выберите JSON-файл аддона, чтобы установить.</p>
            </div>
          ) : (
            <div className="addons-grid">
              {filteredAddons.map(a => (
                <AddonCard
                  key={a.id}
                  addon={a}
                  missingDeps={getMissingDeps(a.manifest.dependencies)}
                  onToggle={(id, en) => toggleAddon(id, en)}
                  onRemove={handleRemoveAddon}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'mods' && (
        <>
          <p className="addons-page__hint addons-page__hint--warn">
            <AlertTriangle size={14} />
            Модификации — JS-скрипты с расширенным доступом к API приложения.
            Каждый мод хранится в отдельной папке с <code>manifest.json</code> и точкой входа JS.
            Устанавливайте только из доверенных источников.
          </p>
          {filteredMods.length === 0 ? (
            <div className="addons-empty">
              <div className="addons-empty__icon"><Wrench size={48} /></div>
              <p>{search ? 'Ничего не найдено' : 'Нет установленных модификаций.'}</p>
              <p className="addons-empty__sub">Укажите <code>manifest.json</code> из папки мода, чтобы установить.</p>
            </div>
          ) : (
            <div className="addons-grid">
              {filteredMods.map(m => (
                <ModCard
                  key={m.id}
                  mod={m}
                  missingDeps={getMissingDeps(m.manifest.dependencies)}
                  onToggle={(id, en) => toggleMod(id, en)}
                  onRemove={handleRemoveMod}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
