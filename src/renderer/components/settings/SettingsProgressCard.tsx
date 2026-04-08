export function SettingsProgressCard({
  onResetGame,
  onResetAll,
}: {
  onResetGame: () => void;
  onResetAll: () => void;
}) {
  return (
    <div className="card settings-card">
      <h4>Прогресс</h4>
      <button className="btn-secondary" onClick={onResetGame}>
        Сбросить игровой прогресс
      </button>
      <button className="btn-danger" onClick={onResetAll}>
        Сбросить прогресс
      </button>
    </div>
  );
}
