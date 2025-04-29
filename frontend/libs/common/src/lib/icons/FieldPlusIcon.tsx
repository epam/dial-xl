import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export function FieldPlusIcon({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11 3H14C14.1989 3 14.3897 3.07902 14.5303 3.21967C14.671 3.36032 14.75 3.55109 14.75 3.75V14.25C14.75 14.4489 14.671 14.6397 14.5303 14.7803C14.3897 14.921 14.1989 15 14 15H11C10.8011 15 10.6103 14.921 10.4697 14.7803C10.329 14.6397 10.25 14.4489 10.25 14.25V3.75C10.25 3.55109 10.329 3.36032 10.4697 3.21967C10.6103 3.07902 10.8011 3 11 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.75 9H7.25M5 6.75V11.25"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
