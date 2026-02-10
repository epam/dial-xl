import {
  DatabaseIcon,
  DialChatLogoIcon,
  PostgresSourceIcon,
  S3SourceIcon,
  SnowflakeSourceIcon,
} from '@frontend/common';

export const externalSourceIconMapping: {
  [source: string]: () => JSX.Element;
} = {
  snowflake: SnowflakeSourceIcon,
  dial: DialChatLogoIcon,
  s3: S3SourceIcon,
  'airbyte-postgres': PostgresSourceIcon,
};

export const getSourceIcon = (itemDefinition: string) => {
  const ResultedIcon = externalSourceIconMapping[itemDefinition];

  return ResultedIcon ? <ResultedIcon /> : <DatabaseIcon />;
};
