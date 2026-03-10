import { DatePicker as AntDatePicker } from 'antd';

import dateFnsGenerateConfig from '@rc-component/picker/generate/dateFns';

export const DatePicker = AntDatePicker.generatePicker<Date>(
  dateFnsGenerateConfig,
);
