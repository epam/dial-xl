import { QGIconProps } from '../types';
import { getColorVar } from '../utils/icon';

export const ViewportNarrowIcon = ({
  secondaryAccentCssVar = '',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      vectorEffect="non-scaling-stroke"
      viewBox="0 0 24 24"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path d="M3 12h7l-3 -3" stroke={getColorVar(secondaryAccentCssVar)} />
      <path d="M7 15l3 -3" stroke={getColorVar(secondaryAccentCssVar)} />
      <path d="M21 12h-7l3 -3" stroke={getColorVar(secondaryAccentCssVar)} />
      <path d="M17 15l-3 -3" stroke={getColorVar(secondaryAccentCssVar)} />
      <path d="M9 6v-1a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v1" />
      <path d="M9 18v1a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-1" />
    </svg>
  );
};
