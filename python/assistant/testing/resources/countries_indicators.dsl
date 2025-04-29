table Indicators
  dim [source] = INPUT("files/3XT6pfFPHHAEaXMXXu8hem7b9yyL7obDzJVFsMHUH8Z3iEKczKjFnMSNiaZXnyvdqk/appdata/xl/qg-root/IMF-WEO-DATA/imf-weo-data.csv")
  [COUNTRY.ID] = [source][COUNTRY.ID]
  !description("COUNTRY.Description")
  !size(3) key [COUNTRY.Name] = [source][COUNTRY.Name]
  [COUNTRY.Description] = [source][COUNTRY.Description]
  [INDICATOR.ID] = [source][INDICATOR.ID]
  !size(8) key [INDICATOR.Name] = [source][INDICATOR.Name]
  [INDICATOR.Unit] = [source][INDICATOR.Unit]
  [INDICATOR.AFR Code DMX database] = [source][INDICATOR.AFR Code DMX database]
  [INDICATOR.Formula] = [source][INDICATOR.Formula]
  [INDICATOR.Primary Code] = [source][INDICATOR.Primary Code]
  [FREQUENCY.ID] = [source][FREQUENCY.ID]
  key [FREQUENCY.Name] = [source][FREQUENCY.Name]
  [FREQUENCY.Description] = [source][FREQUENCY.Description]
  key [TIME_PERIOD] = [source][TIME_PERIOD]
  [OBS_VALUE] = [source][OBS_VALUE]
  [SCALE.ID] = [source][SCALE.ID]
  [SCALE.Name] = [source][SCALE.Name]
  [SCALE.Description] = [source][SCALE.Description]
  [date] = DATE([TIME_PERIOD], 1, 1)
