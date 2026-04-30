type ResultCalloutProps = {
  detail: string;
  title: string;
};

export function ResultCallout({ detail, title }: ResultCalloutProps) {
  return (
    <div className="result-guidance-card result-callout-text" role="note">
      <b className="result-guidance-title">{title}.</b>
      <span className="result-guidance-detail">{detail}</span>
    </div>
  );
}
