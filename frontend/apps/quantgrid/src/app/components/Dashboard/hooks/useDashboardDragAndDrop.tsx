import {
  DragEvent as ReactDragEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

interface Props {
  onUpload: (files: FileList) => void;
}

export const useDashboardDragAndDrop = ({ onUpload }: Props) => {
  const [isDragInProgress, setDragInProgress] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const handleDragEnter = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    setIsOver(true);
  }, []);
  const handleDragLeave = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    setIsOver(false);
  }, []);

  const handlePageDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    setDragInProgress(true);
  }, []);

  const handlePageDrop = useCallback((event: DragEvent) => {
    event.preventDefault();

    if (event.target && document.contains(event.target as Node)) return;

    setDragInProgress(false);
  }, []);

  const handlePageLeave = useCallback((event: DragEvent) => {
    event.preventDefault();

    if (event.target && document.contains(event.relatedTarget as Node)) return;

    setDragInProgress(false);
  }, []);

  const handleDrop = useCallback(
    (event: ReactDragEvent) => {
      event.preventDefault();

      setDragInProgress(false);

      const files = event.dataTransfer?.files;

      if (!files || !files.length) return;

      onUpload(files);
    },
    [onUpload],
  );

  useEffect(() => {
    document.addEventListener('dragover', handlePageDragOver);
    document.addEventListener('dragleave', handlePageLeave);
    document.addEventListener('drop', handlePageDrop);

    return () => {
      document.removeEventListener('dragover', handlePageDragOver);
      document.removeEventListener('dragleave', handlePageLeave);
      document.removeEventListener('drop', handlePageDrop);
    };
  }, [handlePageDragOver, handlePageDrop, handlePageLeave]);

  return {
    isDragInProgress,
    isOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
};
