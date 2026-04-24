type ResultCalloutProps = {
  detail: string;
  title: string;
};

export function ResultCallout({ detail, title }: ResultCalloutProps) {
  return (
    <p className="result-callout-text">
      <b>{title}.</b> {detail}
    </p>
  );
}
