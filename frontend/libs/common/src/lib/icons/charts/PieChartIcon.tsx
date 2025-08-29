import { QGIconProps } from '../../types/icon';
import { getColorVar } from '../../utils/icon';

export const PieChartIcon = ({
  tertiaryAccentCssVar: secondaryColorClass = 'text-warning',
  secondaryAccentCssVar: primaryColorClass = 'text-secondary',
}: QGIconProps) => {
  return (
    <svg fill="none" viewBox="0 0 18 18" width="100%">
      <ellipse
        cx="9"
        cy="9"
        rx="6.6"
        ry="6.6"
        stroke={getColorVar(primaryColorClass)}
      ></ellipse>
      <path
        d="M9 2.25V9H15.75C15.75 8.11358 15.5754 7.23583 15.2362 6.41689C14.897 5.59794 14.3998 4.85382 13.773 4.22703C13.1462 3.60023 12.4021 3.10303 11.5831 2.76381C10.7642 2.42459 9.88642 2.25 9 2.25Z"
        fill={getColorVar(secondaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 2.25V9H15.75"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
