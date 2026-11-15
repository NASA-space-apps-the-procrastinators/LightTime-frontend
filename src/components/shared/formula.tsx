import { Fragment } from "react";

// The 2 after an O in CO2, O2, ppO2, SpO2, VO2; not part of a longer number.
const O2 = /(?<=O)2(?!\d)/;

/** Renders chemical formulas with a real subscript 2, in the surrounding font. */
export function Formula({ children }: { children: string }) {
  const parts = children.split(O2);
  // One span, so a flex parent treats the formula as one piece of text.
  return (
    <span>
      {parts.map((part, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: parts of one fixed string
        <Fragment key={i}>
          {i > 0 && <sub>2</sub>}
          {part}
        </Fragment>
      ))}
    </span>
  );
}
