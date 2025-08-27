import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const SortDescendingIcon = ({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      stroke={getColorVar(primaryColorClass)}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      vectorEffect="non-scaling-stroke"
      viewBox="0 0 24 24"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path d="M15 21v-5c0 -1.38 .62 -2 2 -2s2 .62 2 2v5m0 -3h-4" />
      <path d="M19 10h-4l4 -7h-4" />
      <path d="M4 15l3 3l3 -3" />
      <path d="M7 6v12" />
    </svg>
  );
};
