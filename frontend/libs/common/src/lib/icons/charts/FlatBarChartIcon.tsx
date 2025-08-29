import { QGIconProps } from '../../types/icon';
import { getColorVar } from '../../utils/icon';

export const FlatBarChartIcon = ({
  secondaryAccentCssVar: primaryColorClass = 'text-accent-primary',
  tertiaryAccentCssVar: secondaryColorClass = 'text-secondary',
}: QGIconProps) => {
  return (
    <svg fill="none" viewBox="0 0 18 18" width="100%">
      <rect
        fill={getColorVar(secondaryColorClass)}
        height="3"
        rx="0.625"
        width="1.25"
        x="1.625"
        y="12.75"
      />
      <rect
        fill={getColorVar(primaryColorClass)}
        height="7.5"
        rx="0.625"
        width="1.25"
        x="3.875"
        y="8.25"
      />
      <rect
        fill={getColorVar(secondaryColorClass)}
        height="10.5"
        rx="0.625"
        width="1.25"
        x="7.25"
        y="5.25"
      />
      <rect
        fill={getColorVar(primaryColorClass)}
        height="6"
        rx="0.625"
        width="1.25"
        x="9.5"
        y="9.75"
      />
      <rect
        fill={getColorVar(secondaryColorClass)}
        height="9"
        rx="0.625"
        width="1.25"
        x="12.875"
        y="6.75"
      />
      <rect
        fill={getColorVar(primaryColorClass)}
        height="13.5"
        rx="0.625"
        width="1.25"
        x="15.125"
        y="2.25"
      />
    </svg>
  );
};
