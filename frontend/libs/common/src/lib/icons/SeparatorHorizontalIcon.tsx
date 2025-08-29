import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export function SeparatorHorizontalIcon({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="9"
        cy="9"
        fill="#FCFCFC"
        r="8.5"
        stroke={getColorVar(primaryColorClass)}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="m 3.654705,9.003757 h 10.66671 m -8.00004,-2.66666 2.66667,-2.66667 2.66667,2.66667 m 0,5.33336 -2.66667,2.6666 -2.66667,-2.6666"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
