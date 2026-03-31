type Props = {
  question: string;
  answer: string;
};

export function FaqDisclosure({ question, answer }: Props) {
  return (
    <details className="surface-glass-sm p-4">
      <summary className="cursor-pointer font-medium">{question}</summary>
      <p className="mt-2 text-sm text-[var(--muted)]">{answer}</p>
    </details>
  );
}
