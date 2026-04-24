import { Trophy } from 'lucide-react';

type GameTerminalSummaryCardProps = {
  description: string;
  title: string;
};

export function GameTerminalSummaryCard({
  description,
  title,
}: GameTerminalSummaryCardProps) {
  return (
    <div className="card mt-16">
      <h4><Trophy size={16} className="ui-inline-icon" /> {title}</h4>
      <p className="card-desc">{description}</p>
    </div>
  );
}
