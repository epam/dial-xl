import { QGIconProps } from '../types/icon';
import { getColorVar } from '../utils/icon';

export const EyeOffIcon = ({
  secondaryAccentCssVar: primaryColorClass = '',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.5851 11.0869C10.21 11.4621 9.99942 11.9708 9.99951 12.5013C9.99961 13.0317 10.2104 13.5404 10.5856 13.9154C10.9607 14.2904 11.4695 14.5011 11.9999 14.501C12.5304 14.5009 13.039 14.2901 13.4141 13.9149M16.681 17.173C15.2782 18.0507 13.6547 18.5109 12 18.5C8.4 18.5 5.4 16.5 3 12.5C4.272 10.38 5.712 8.82203 7.32 7.82603M10.18 6.68003C10.779 6.55876 11.3888 6.49845 12 6.50003C15.6 6.50003 18.6 8.50003 21 12.5C20.334 13.61 19.621 14.567 18.862 15.37M3 3.5L21 21.5"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
};
