import { QGIconProps } from '../../types/icon';
import { getColorVar } from '../../utils/icon';

export const StackedBarChartIcon = ({
  secondaryAccentCssVar: primaryColorClass = 'text-accent-secondary',
  tertiaryAccentCssVar: secondaryColorClass = 'text-secondary',
}: QGIconProps) => {
  return (
    <svg fill="none" viewBox="0 0 18 18" width="100%">
      <path
        d="M6 15.75L8.25 15.75C8.44891 15.75 8.63968 15.6973 8.78033 15.6036C8.92098 15.5098 9 15.3826 9 15.25L9 13.25C9 13.1174 8.92098 12.9902 8.78033 12.8964C8.63968 12.8027 8.44891 12.75 8.25 12.75L6 12.75M6 15.75L3.75 15.75C3.55109 15.75 3.36032 15.6973 3.21967 15.6036C3.07902 15.5098 3 15.3826 3 15.25L3 13.25C3 13.1174 3.07902 12.9902 3.21967 12.8964C3.36032 12.8027 3.55109 12.75 3.75 12.75L6 12.75M6 15.75L6 12.75"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.78033 12.8964C8.63968 12.8027 8.44891 12.75 8.25 12.75L6 12.75L6 15.75L8.25 15.75C8.44891 15.75 8.63968 15.6973 8.78033 15.6036C8.92098 15.5098 9 15.3826 9 15.25L9 13.25C9 13.1174 8.92098 12.9902 8.78033 12.8964Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 10.5L11.25 10.5C11.4489 10.5 11.6397 10.4473 11.7803 10.3536C11.921 10.2598 12 10.1326 12 10L12 8C12 7.86739 11.921 7.74021 11.7803 7.64645C11.6397 7.55268 11.4489 7.5 11.25 7.5L8.25 7.5M8.25 10.5L3.75 10.5C3.55109 10.5 3.36032 10.4473 3.21967 10.3536C3.07902 10.2598 3 10.1326 3 10L3 8C3 7.86739 3.07902 7.74021 3.21967 7.64645C3.36032 7.55268 3.55109 7.5 3.75 7.5L8.25 7.5M8.25 10.5L8.25 7.5"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.7803 7.64645C11.6397 7.55268 11.4489 7.5 11.25 7.5L8.25 7.5L8.25 10.5L11.25 10.5C11.4489 10.5 11.6397 10.4473 11.7803 10.3536C11.921 10.2598 12 10.1326 12 10L12 8C12 7.86739 11.921 7.74021 11.7803 7.64645Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 5.25L14.25 5.25C14.4489 5.25 14.6397 5.19732 14.7803 5.10355C14.921 5.00979 15 4.88261 15 4.75L15 2.75C15 2.61739 14.921 2.49021 14.7803 2.39645C14.6397 2.30268 14.4489 2.25 14.25 2.25L10.5 2.25M10.5 5.25L3.75 5.25C3.55109 5.25 3.36032 5.19732 3.21967 5.10355C3.07902 5.00978 3 4.88261 3 4.75L3 2.75C3 2.61739 3.07902 2.49021 3.21967 2.39645C3.36032 2.30268 3.55109 2.25 3.75 2.25L10.5 2.25M10.5 5.25L10.5 2.25"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.7803 2.39645C14.6397 2.30268 14.4489 2.25 14.25 2.25L10.5 2.25L10.5 5.25L14.25 5.25C14.4489 5.25 14.6397 5.19732 14.7803 5.10355C14.921 5.00979 15 4.88261 15 4.75L15 2.75C15 2.61739 14.921 2.49021 14.7803 2.39645Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
