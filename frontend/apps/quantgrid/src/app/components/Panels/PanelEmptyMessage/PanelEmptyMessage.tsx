export function PanelEmptyMessage({ message }: { message: string }) {
  return (
    <div className="grow w-full bg-bgLayer3 text-[13px] text-textSecondary text-center pt-3 px-2">
      {message}
    </div>
  );
}
