import { Fragment } from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

type Props = { text: string; className?: string };

const MATH_SEGMENTS = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;

export default function ExamMathText({ text, className }: Props) {
  const parts = String(text || '').split(MATH_SEGMENTS).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        const dollarMath = part.startsWith('$') && part.endsWith('$');
        const parenMath = part.startsWith('\\(') && part.endsWith('\\)');
        const bracketMath = part.startsWith('\\[') && part.endsWith('\\]');
        if (!dollarMath && !parenMath && !bracketMath) return <Fragment key={index}>{part}</Fragment>;
        const expression = dollarMath
          ? part.replace(/^\$\$?/, '').replace(/\$\$?$/, '')
          : part.slice(2, -2);
        return <InlineMath key={index} math={expression} renderError={() => <>{expression}</>} />;
      })}
    </span>
  );
}
