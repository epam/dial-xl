import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const SortIcon = ({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.25 15.75H11.25L14.25 10.5H11.25M3 11.25L5.25 13.5M5.25 13.5L7.5 11.25M5.25 13.5V4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 7.5V3.75C11.25 2.715 11.715 2.25 12.75 2.25C13.785 2.25 14.25 2.715 14.25 3.75V7.5M14.25 5.25H11.25"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
