import { QGIconProps } from '../../types/icon';
import { getColorVar } from '../../utils/icon';

export const StackedColumnChartIcon = ({
  secondaryAccentCssVar: primaryColorClass = 'text-accent-secondary',
  tertiaryAccentCssVar: secondaryColorClass = 'text-secondary',
}: QGIconProps) => {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 18"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 15.75,12 V 9.75 C 15.75,9.55109 15.6973,9.36032 15.6036,9.21967 15.5098,9.07902 15.3826,9 15.25,9 h -2 C 13.1174,9 12.9902,9.07902 12.8964,9.21967 12.8027,9.36032 12.75,9.55109 12.75,9.75 V 12 m 3,0 v 2.25 c 0,0.19891 -0.0527,0.38968 -0.1464,0.53033 C 15.5098,14.92098 15.3826,15 15.25,15 h -2 C 13.1174,15 12.9902,14.92098 12.8964,14.78033 12.8027,14.63968 12.75,14.44891 12.75,14.25 V 12 m 3,0 h -3"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 12.8964,9.21967 C 12.8027,9.36032 12.75,9.55109 12.75,9.75 V 12 h 3 V 9.75 C 15.75,9.55109 15.6973,9.36032 15.6036,9.21967 15.5098,9.07902 15.3826,9 15.25,9 h -2 c -0.1326,0 -0.2598,0.07902 -0.3536,0.21967 z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m 10.5,9.75 v -3 C 10.5,6.5511 10.4473,6.3603 10.3536,6.2197 10.2598,6.079 10.1326,6 10,6 H 8 C 7.86739,6 7.74021,6.079 7.64645,6.2197 7.55268,6.3603 7.5,6.5511 7.5,6.75 v 3 m 3,0 v 4.5 c 0,0.19891 -0.0527,0.38968 -0.1464,0.53033 C 10.2598,14.92098 10.1326,15 10,15 H 8 C 7.86739,15 7.74021,14.92098 7.64645,14.78033 7.55268,14.63968 7.5,14.44891 7.5,14.25 v -4.5 m 3,0 h -3"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 7.64645,6.2197 C 7.55268,6.3603 7.5,6.5511 7.5,6.75 v 3 h 3 v -3 C 10.5,6.5511 10.4473,6.3603 10.3536,6.2197 10.2598,6.079 10.1326,6 10,6 H 8 C 7.86739,6 7.74021,6.079 7.64645,6.2197 Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 5.25,7.5 V 3.75 C 5.25,3.5511 5.19732,3.3603 5.10355,3.2197 5.00979,3.079 4.88261,3 4.75,3 h -2 C 2.61739,3 2.49021,3.079 2.39645,3.2197 2.30268,3.3603 2.25,3.5511 2.25,3.75 V 7.5 m 3,0 v 6.75 c 0,0.19891 -0.05268,0.38968 -0.14645,0.53033 C 5.00978,14.92098 4.88261,15 4.75,15 h -2 C 2.61739,15 2.49021,14.92098 2.39645,14.78033 2.30268,14.63968 2.25,14.44891 2.25,14.25 V 7.5 m 3,0 h -3"
        stroke={getColorVar(secondaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 2.39645,3.2197 C 2.30268,3.3603 2.25,3.5511 2.25,3.75 V 7.5 h 3 V 3.75 C 5.25,3.5511 5.19732,3.3603 5.10355,3.2197 5.00979,3.079 4.88261,3 4.75,3 h -2 C 2.61739,3 2.49021,3.079 2.39645,3.2197 Z"
        fill={getColorVar(primaryColorClass)}
        fillOpacity="0.15"
        stroke={getColorVar(primaryColorClass)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
