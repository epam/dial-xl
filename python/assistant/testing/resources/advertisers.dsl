table Advertisers
  dim [Source], \
  [Platform], \
  [Segment], \
  !format("number", 0, 0)
  [Fiscal Year], \
  !index()
  [Fiscal Qtr Code], \
  [Business Unit], \
  [Network], \
  [Order Type], \
  [Automation], \
  [Order Status], \
  [Advertiser Name], \
  [Category_Mapped], \
  [Subcategory_Mapped], \
  [Category Remapped (Timebuy)], \
  [Holdco_Mapped], \
  [Agency_PM_Mapped], \
  [Sales Stage Probability], \
  [Homogenized Marketplace], \
  [Category (Timebuy)], \
  [Sales Team], \
  [Final PM], \
  [Media Type], \
  [Rita Top-Level Segment], \
  [Rita Segment], \
  [Ad Type], \
  [Net Booked Revenue (adj)] = INPUT("files/{{ bucket }}/test-resources/CPG%20DATA.csv")[[Source], \
  [Platform], \
  [Segment], \
  [Fiscal Year], \
  [Fiscal Qtr Code], \
  [Business Unit], \
  [Network], \
  [Order Type], \
  [Automation], \
  [Order Status], \
  [Advertiser Name], \
  [Category_Mapped], \
  [Subcategory_Mapped], \
  [Category Remapped (Timebuy)], \
  [Holdco_Mapped], \
  [Agency_PM_Mapped], \
  [Sales Stage Probability], \
  [Homogenized Marketplace], \
  [Category (Timebuy)], \
  [Sales Team], \
  [Final PM], \
  [Media Type], \
  [Rita Top-Level Segment], \
  [Rita Segment], \
  [Ad Type], \
  [Net Booked Revenue (adj)]]
  [Net Booked Revenue (Number)] = VALUE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE([Net Booked Revenue (adj)], "$", ""), ",", ""), "-", ""))

