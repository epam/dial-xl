export function FormulaBarDivider() {
  return (
    <div className="relative h-full">
      <div className="absolute h-full min-w-[3px] w-[3px] bg-strokeTertiary flex items-center justify-center">
        <div className="h-3 w-[1px] bg-strokeSecondary rounded-lg"></div>
      </div>
    </div>
  );
}
