export function triggerDownload(fileUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = fileUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(fileUrl);
}
