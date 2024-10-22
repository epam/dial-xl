import { ReactNode } from 'react';

import { MenuItem } from '@frontend/common';

export interface Breadcrumb {
  icon?: ReactNode;
  name: string;
  path: string | null | undefined;
  dropdownItems?: MenuItem[];
  bucket?: string; // should not be presented for shared with me root breadcrumb
}
