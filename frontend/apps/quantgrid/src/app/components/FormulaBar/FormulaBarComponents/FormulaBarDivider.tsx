export function FormulaBarDivider() {
  return (
    <div className="relative h-full">
      <div className="absolute h-full min-w-[3px] w-[3px] bg-stroke-tertiary flex items-center justify-center">
        <div className="h-3 w-px bg-stroke-secondary rounded-lg"></div>
      </div>
    </div>
  );
}
