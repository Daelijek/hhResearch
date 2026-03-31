type Props = {
  question: string;
  answer: string;
};

export function FaqDisclosure({ question, answer }: Props) {
  return (
    <details className="hh-faq-disclosure surface-glass-sm p-4 lg:p-5">
      <summary className="cursor-pointer text-sm font-medium lg:text-base">
        {question}
      </summary>
      <div className="hh-faq-disclosure__content">
        <p className="text-sm text-[var(--muted)] lg:text-base lg:leading-7">
          {answer}
        </p>
      </div>
    </details>
  );
}

