type Props = {
  question: string;
  answer: string;
};

export function FaqDisclosure({ question, answer }: Props) {
  return (
    <details className="surface-glass-sm p-4 lg:p-5">
      <summary className="cursor-pointer text-sm font-medium lg:text-base">{question}</summary>
      <p className="mt-2 text-sm text-[var(--muted)] lg:text-base lg:leading-7">{answer}</p>
    </details>
  );
}
