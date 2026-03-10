!layout(2, 2)
table T1
  dim [a] = RANGE(10)
  ## In quadratic dependency from a
  !size(2)
  [b] = [a]^2