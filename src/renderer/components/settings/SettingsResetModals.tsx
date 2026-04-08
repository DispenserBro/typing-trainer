type SettingsResetModalsProps = {
  showResetGameModal: boolean;
  showResetModal: boolean;
  onCloseResetGame: () => void;
  onCloseResetAll: () => void;
  onConfirmResetGame: () => void;
  onConfirmResetAll: () => void;
};

export function SettingsResetModals({
  showResetGameModal,
  showResetModal,
  onCloseResetGame,
  onCloseResetAll,
  onConfirmResetGame,
  onConfirmResetAll,
}: SettingsResetModalsProps) {
  return (
    <>
      {showResetGameModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCloseResetGame(); }}>
          <div className="modal">
            <h3>Сброс игрового прогресса</h3>
            <p className="card-desc">
              Это действие необратимо. После подтверждения приложение очистит только прогресс игрового режима.
            </p>
            <div className="reset-progress-note">
              Будет сброшено:
              <ul className="reset-progress-list">
                <li>текущий забег и достигнутый уровень</li>
                <li>все достижения игрового режима</li>
                <li>все собранные предметы и экипировка</li>
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn-danger" onClick={onConfirmResetGame}>Сбросить</button>
              <button className="btn-secondary" onClick={onCloseResetGame}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {showResetModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCloseResetAll(); }}>
          <div className="modal">
            <h3>Сброс прогресса</h3>
            <p className="card-desc">
              Это действие необратимо. После подтверждения приложение очистит весь накопленный прогресс, но сохранит ваши текущие настройки.
            </p>
            <div className="reset-progress-note">
              Будет сброшено:
              <ul className="reset-progress-list">
                <li>статистика по клавишам и история результатов</li>
                <li>прогресс уроков и практики</li>
                <li>открытые буквы и прогресс открытия</li>
                <li>весь игровой прогресс, предметы и текущий забег</li>
              </ul>
            </div>
            <div className="modal-actions">
              <button className="btn-danger" onClick={onConfirmResetAll}>Сбросить</button>
              <button className="btn-secondary" onClick={onCloseResetAll}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
