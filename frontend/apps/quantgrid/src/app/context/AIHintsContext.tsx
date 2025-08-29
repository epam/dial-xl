import { Modal } from 'antd';
import classNames from 'classnames';
import {
  ChangeEvent,
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import {
  AIHint,
  AIHintTrigger,
  modalFooterButtonClasses,
  primaryButtonClasses,
  projectFoldersRootPrefix,
  secondaryButtonClasses,
} from '@frontend/common';

import { EditAIHint } from '../components';
import { useApiRequests } from '../hooks';
import { createUniqueName } from '../services';
import { constructPath, isHintValid, triggerDownload } from '../utils';
import { ProjectContext } from './ProjectContext';

type AIHintsContextActions = {
  hints: AIHint[];
  hintsValidationResult: boolean[];
  isHintsLoading: boolean;

  getHints: () => void;
  updateHints: (updatedHints: AIHint[]) => void;
  newHintsModal: () => void;
  editHintModal: (index: number) => void;
  deleteHintModal: (index: number) => void;

  importAIHints: () => void;
  exportAIHints: () => void;

  selectedHintsIndexes: number[];
  toggleSelectionHint: (hintIndex: number) => void;

  toggleHintVisibility: (hintIndex: number) => void;
};

export const AIHintsContext = createContext<AIHintsContextActions>(
  {} as AIHintsContextActions
);

export function AIHintsContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { projectName, projectBucket, projectPath } =
    useContext(ProjectContext);
  const { getAIHintsContent, putAIHintsContent } = useApiRequests();

  const [hints, setHints] = useState<AIHint[]>([]);
  const [isHintsLoading, setIsHintsLoading] = useState(false);
  const [isShowEditModal, setIsShowEditModal] = useState(false);

  const [editedAIHintIndex, setEditedAIHintIndex] = useState<
    number | undefined
  >();
  const [selectedHintsIndexes, setSelectedHintsIndexes] = useState<number[]>(
    []
  );
  const importFilesInputRef = useRef<HTMLInputElement>(null);

  const editedAIHint = useMemo(() => {
    return editedAIHintIndex !== undefined
      ? hints[editedAIHintIndex]
      : undefined;
  }, [editedAIHintIndex, hints]);
  const otherHints = useMemo(() => {
    return hints.filter((_, index) => index !== editedAIHintIndex);
  }, [editedAIHintIndex, hints]);
  const hintsValidationResult = useMemo(() => {
    return hints.map((hint, index) =>
      isHintValid(hint, [...hints.slice(0, index), ...hints.slice(index + 1)])
    );
  }, [hints]);

  // Temporary function to normalize hints to extended format
  const normalizeAIHintsResponse = useCallback(
    (
      aiHints: (AIHint & { triggers: (string | AIHintTrigger)[] })[]
    ): AIHint[] => {
      return aiHints.map((hint) => ({
        ...hint,
        triggers: hint.triggers.map((trigger) =>
          typeof trigger === 'string'
            ? { value: trigger, isDisabled: false }
            : trigger
        ),
      }));
    },
    []
  );

  const getHints = useCallback(async () => {
    if (!projectBucket) {
      return;
    }

    setHints([]);
    setIsHintsLoading(true);

    const aiHintsResponse = await getAIHintsContent({
      bucket: projectBucket,
      path: constructPath([projectFoldersRootPrefix, projectPath, projectName]),
      suppressErrors: true,
    });

    setIsHintsLoading(false);

    const normalizedAIHintsResponse = normalizeAIHintsResponse(
      (aiHintsResponse?.json ?? []) as any
    );
    setHints(normalizedAIHintsResponse);
  }, [
    getAIHintsContent,
    normalizeAIHintsResponse,
    projectBucket,
    projectName,
    projectPath,
  ]);

  const updateHints = useCallback(
    async (updatedHints: AIHint[]) => {
      if (!projectBucket) {
        return;
      }

      setHints(updatedHints);
      setSelectedHintsIndexes([]);

      await putAIHintsContent({
        bucket: projectBucket,
        path: constructPath([
          projectFoldersRootPrefix,
          projectPath,
          projectName,
        ]),
        hints: updatedHints,
      });
    },
    [projectBucket, projectName, projectPath, putAIHintsContent]
  );

  const newHintsModal = useCallback(() => {
    setIsShowEditModal(true);
  }, []);
  const editHintModal = useCallback((index: number) => {
    setEditedAIHintIndex(index);

    setIsShowEditModal(true);
  }, []);
  const deleteHintModal = useCallback(
    (hintIndex: number) => {
      setSelectedHintsIndexes([]);

      Modal.confirm({
        icon: null,
        title: 'Confirm',
        content: `Are you sure you want to delete this hint?`,
        okButtonProps: {
          className: classNames(modalFooterButtonClasses, primaryButtonClasses),
        },
        cancelButtonProps: {
          className: classNames(
            modalFooterButtonClasses,
            secondaryButtonClasses
          ),
        },
        onOk: async () => {
          const updatedHints = hints.filter((_, index) => hintIndex !== index);

          updateHints(updatedHints);
        },
      });
    },
    [hints, updateHints]
  );

  const handleDeleteEditedHint = useCallback(() => {
    setSelectedHintsIndexes([]);

    Modal.confirm({
      icon: null,
      title: 'Confirm',
      content: `Are you sure you want to delete this hint?`,
      okButtonProps: {
        className: classNames(modalFooterButtonClasses, primaryButtonClasses),
      },
      cancelButtonProps: {
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      },
      onOk: async () => {
        const updatedHints = hints.filter(
          (_, index) => editedAIHintIndex !== index
        );
        setEditedAIHintIndex(undefined);
        setIsShowEditModal(false);

        updateHints(updatedHints);
      },
    });
  }, [editedAIHintIndex, hints, updateHints]);

  const handleCancelEditModal = useCallback(() => {
    setSelectedHintsIndexes([]);

    setIsShowEditModal(false);
    setEditedAIHintIndex(undefined);
  }, []);

  const handleSaveEditModal = useCallback(
    (hintToSave: AIHint) => {
      setSelectedHintsIndexes([]);

      const hintIndex = editedAIHintIndex;

      setIsShowEditModal(false);
      setEditedAIHintIndex(undefined);

      let updatedHints;
      if (hintIndex !== undefined) {
        updatedHints = hints.map((hint, index) =>
          index === hintIndex ? hintToSave : hint
        );
      } else {
        updatedHints = [hintToSave, ...hints];
      }

      updateHints(updatedHints);
    },
    [editedAIHintIndex, hints, updateHints]
  );

  const importAIHints = useCallback(() => {
    setSelectedHintsIndexes([]);

    importFilesInputRef.current?.click();
  }, []);
  const handleImportFiles = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;

      if (!input.files) return;

      const file = input.files[0];

      if (!file) return;

      try {
        const importedHints: AIHint[] = JSON.parse(await file.text());
        const currentHintsNames = hints.map((hint) => hint.name);

        const fixedHints = importedHints.map((hint) => {
          if (currentHintsNames.includes(hint.name)) {
            const newName = createUniqueName(hint.name, currentHintsNames);
            currentHintsNames.push(newName);

            return {
              ...hint,
              name: newName,
            };
          }

          return hint;
        });

        await updateHints([...fixedHints, ...hints]);

        toast.success('AI Hints imported successfully');
      } catch {
        /* empty */
      }
    },
    [hints, updateHints]
  );

  const exportAIHints = useCallback(() => {
    const selectedAIHints =
      selectedHintsIndexes.length > 0
        ? hints.filter((_, index) => selectedHintsIndexes.includes(index))
        : hints;

    const content = new Blob([JSON.stringify(selectedAIHints)], {
      type: 'text/plain',
    });
    const fileName = `dial-xl-download-${new Date().toISOString()}.hints.ai`;
    const file = new File([content], fileName);
    const fileUrl = window.URL.createObjectURL(file);

    setSelectedHintsIndexes([]);

    triggerDownload(fileUrl, fileName);
  }, [hints, selectedHintsIndexes]);

  const toggleSelectionHint = useCallback((hintIndex: number) => {
    setSelectedHintsIndexes((selectedHints) => {
      const currentSelection = new Set(selectedHints);

      if (currentSelection.has(hintIndex)) {
        currentSelection.delete(hintIndex);
      } else {
        currentSelection.add(hintIndex);
      }

      return Array.from(currentSelection);
    });
  }, []);

  const toggleHintVisibility = useCallback(
    (hintIndex: number) => {
      updateHints(
        hints.map((hint, index) =>
          hintIndex === index ? { ...hint, isDisabled: !hint.isDisabled } : hint
        )
      );
    },
    [hints, updateHints]
  );

  useEffect(() => {
    if (projectBucket) {
      getHints();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectBucket]);

  const value = useMemo(
    () => ({
      hints,
      hintsValidationResult,
      isHintsLoading,
      getHints,
      updateHints,
      newHintsModal,
      editHintModal,
      deleteHintModal,
      importAIHints,
      exportAIHints,
      selectedHintsIndexes,
      toggleSelectionHint,
      toggleHintVisibility,
    }),
    [
      hints,
      hintsValidationResult,
      isHintsLoading,
      getHints,
      updateHints,
      newHintsModal,
      editHintModal,
      deleteHintModal,
      importAIHints,
      exportAIHints,
      selectedHintsIndexes,
      toggleSelectionHint,
      toggleHintVisibility,
    ]
  );

  return (
    <AIHintsContext.Provider value={value}>
      {children}

      <input
        accept={'.ai'}
        className="hidden"
        id="hints-import"
        ref={importFilesInputRef}
        type="file"
        onChange={handleImportFiles}
        onClick={(e) => {
          (e.target as any).value = null;
        }}
      ></input>

      {isShowEditModal && (
        <EditAIHint
          hintToEdit={editedAIHint}
          isNewHint={!editedAIHint}
          otherHints={otherHints}
          onCancel={handleCancelEditModal}
          onDelete={() => handleDeleteEditedHint()}
          onSave={handleSaveEditModal}
        />
      )}
    </AIHintsContext.Provider>
  );
}
