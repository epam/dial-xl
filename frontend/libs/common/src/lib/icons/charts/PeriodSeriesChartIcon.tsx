import { QGIconProps } from '../../types/icon';
import { getColorVar } from '../../utils/icon';

export const PeriodSeriesChartIcon = ({
  secondaryAccentCssVar: primaryColorClass = 'text-accent-tertiary',
  tertiaryAccentCssVar: secondaryColorClass = 'text-secondary',
}: QGIconProps) => {
  return (
    <svg fill="none" viewBox="0 0 18 18" width="100%">
      <path
        d="M3 14.25H15"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 11.25L6 6.75L9 8.25L12 4.5L15 7.5"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
