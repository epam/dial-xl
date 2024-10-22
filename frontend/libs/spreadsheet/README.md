# Spreadsheet

This library contains configs and useful functions for the grid, which will working as spreadsheet.

## Structure

**components** - react components that related with grid (context menu, charts, tooltips, etc.)

**grid** - main grid business logic, contains services that provides rendering, grid.ts - main file, initContainer.ts - DI container where services placed

**hooks** - react hooks that handles DOM Events, and interacts with grid to provide information to update grid. (for example: useSelectionEvents handles DOM Events and updates selection using grid.updateSelection() method)

**services** - LEGACY, contains only grid.service.ts that used in hooks or services to non-directional access of current tables and data. should be removed

**utils** - help functions that could be used in hooks or services

## Tech debt

1. All floating elements (like selection, charts, etc.) should just placed inside dataContainer in DataView.
   There is no need to update position relatively from viewport. Putting into dataContainer removing all this recalculation logic. Check the try of implementation shadows based on this in close MR here: https://gitlab.deltixhub.com/Deltix/quantgrid/-/merge_requests/421
2. Columns configuration should be removed. It's part from initial version of grid. It could be made by analogy how DataView works with rows. It doesn't have configuration by every row. Same logic should be in columns.
3. rowService, columnStateService, columnService should be removed from project. Columns logic should be placed (resizing, etc) should be placed in one service by analogy with rowNumberService.
4. All rendering that needs data should get it using dataService. (for example: isCellTableHeader method should be in dataService, no need to understand in DataView using getValue() from columnConfiguration)
