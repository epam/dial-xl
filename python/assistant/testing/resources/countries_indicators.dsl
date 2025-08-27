table Indicators
  dim [INDICATOR.ID],\
  [COUNTRY.ID],\
  !description("COUNTRY.Description")
  !size(3) key [COUNTRY.Name],\
  [COUNTRY.Description],\
  !size(8) key [INDICATOR.Name],\
  [INDICATOR.Unit],\
  [INDICATOR.AFR Code DMX database],\
  [INDICATOR.Formula],\
  [INDICATOR.Primary Code],\
  [FREQUENCY.ID],\
  key [FREQUENCY.Name],\
  [FREQUENCY.Description],\
  key [TIME_PERIOD],\
  [OBS_VALUE],\
  [SCALE.ID],\
  [SCALE.Name],\
  [SCALE.Description] = INPUT("files/{{ bucket }}/test-resources/imf-weo-data.csv")[[INDICATOR.ID],\
  [COUNTRY.ID],\
  [COUNTRY.Name],\
  [COUNTRY.Description],\
  [INDICATOR.Name],\
  [INDICATOR.Unit],\
  [INDICATOR.AFR Code DMX database],\
  [INDICATOR.Formula],\
  [INDICATOR.Primary Code],\
  [FREQUENCY.ID],\
  [FREQUENCY.Name],\
  [FREQUENCY.Description],\
  [TIME_PERIOD],\
  [OBS_VALUE],\
  [SCALE.ID],\
  [SCALE.Name],\
  [SCALE.Description]]
  [date] = DATE([TIME_PERIOD], 1, 1)
