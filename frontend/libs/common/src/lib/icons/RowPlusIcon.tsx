import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const RowPlusIcon = ({
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
        d="M3 14V11C3 10.8011 3.07902 10.6103 3.21967 10.4697C3.36032 10.329 3.55109 10.25 3.75 10.25H14.25C14.4489 10.25 14.6397 10.329 14.7803 10.4697C14.921 10.6103 15 10.8011 15 11V14C15 14.1989 14.921 14.3897 14.7803 14.5303C14.6397 14.671 14.4489 14.75 14.25 14.75H3.75C3.55109 14.75 3.36032 14.671 3.21967 14.5303C3.07902 14.3897 3 14.1989 3 14Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 7.25V2.75M6.75 5H11.25"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
