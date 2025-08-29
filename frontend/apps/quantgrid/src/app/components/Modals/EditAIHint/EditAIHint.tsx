import { Button, Form, Input, Modal, Tooltip } from 'antd';
import classNames from 'classnames';
import { editor } from 'monaco-editor';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import isEqual from 'react-fast-compare';

import Icon from '@ant-design/icons';
import {
  codeEditorOptions,
  codeEditorTheme,
  registerTheme,
} from '@frontend/code-editor';
import {
  AIHint,
  EyeIcon,
  EyeOffIcon,
  inputClasses,
  modalFooterButtonClasses,
  PlusIcon,
  primaryButtonClasses,
  secondaryButtonClasses,
  TrashIcon,
} from '@frontend/common';
import { Editor, Monaco } from '@monaco-editor/react';

import { AppContext, ProjectContext } from '../../../context';

enum formFieldKeys {
  name = 'name',
  triggers = 'triggers',
  isDisabled = 'isDisabled',
  suggestion = 'suggestion',
}

enum triggersFormFieldKeys {
  value = 'value',
  isDisabled = 'isDisabled',
}

type FormFieldsType = {
  [formFieldKeys.name]: string;
  [formFieldKeys.triggers]: {
    [triggersFormFieldKeys.value]: string;
    [triggersFormFieldKeys.isDisabled]: boolean;
  }[];
  [formFieldKeys.isDisabled]: boolean;
  [formFieldKeys.suggestion]: string;
};

interface Props {
  isNewHint: boolean;
  hintToEdit?: AIHint;
  otherHints: AIHint[];
  onCancel: () => void;
  onSave: (hintToSave: AIHint) => void;
  onDelete: () => void;
}

const customQuantThemeName = 'quantMarkdown';

const customizeRequiredMark = (
  label: React.ReactNode,
  { required }: { required: boolean }
) => (
  <>
    <span className="text-textSecondary text-xs">{label}</span>
    &nbsp;
    {required && <span className="text-textError">*</span>}
  </>
);

const CustomVisibleButton = ({
  value,
  onChange,
}: {
  value?: boolean;
  onChange?: (newValue: boolean) => void;
}) => {
  return (
    <Icon
      className="w-[24px] text-textSecondary hover:text-textAccentPrimary"
      component={() => (value ? <EyeIcon /> : <EyeOffIcon />)}
      onClick={() => onChange?.(!value)}
    />
  );
};

export const EditAIHint = ({
  isNewHint,
  hintToEdit = {
    name: '',
    triggers: [{ value: '', isDisabled: false }],
    suggestion: '',
    isDisabled: false,
  },
  otherHints,
  onCancel,
  onSave,
  onDelete,
}: Props) => {
  const { theme } = useContext(AppContext);
  const { isProjectEditable } = useContext(ProjectContext);
  const [monaco, setMonaco] = useState<Monaco | undefined>(undefined);
  const [codeEditor, setCodeEditor] = useState<
    editor.IStandaloneCodeEditor | undefined
  >(undefined);
  const [form] = Form.useForm<FormFieldsType>();
  const isHintDisabled = Form.useWatch('isDisabled', form);
  const formValues = Form.useWatch([], form);

  const initialFormValues = useMemo<FormFieldsType>(
    () => ({
      name: hintToEdit.name,
      suggestion: hintToEdit.suggestion,
      triggers: hintToEdit.triggers,
      isDisabled: hintToEdit.isDisabled ?? false,
    }),
    [hintToEdit]
  );

  const otherHintsNames = useMemo(() => {
    return otherHints.map((hint) => hint.name);
  }, [otherHints]);
  const otherHintsTriggers = useMemo(() => {
    return otherHints.map((hint) => hint.triggers).flat();
  }, [otherHints]);

  const isFormChanged = useMemo(() => {
    return isProjectEditable && !isEqual(initialFormValues, formValues);
  }, [formValues, initialFormValues, isProjectEditable]);

  const onCodeEditorMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      setCodeEditor(editor);
      setMonaco(monaco);
    },
    []
  );

  const existingHintNameValidator = useCallback(
    (_: any, value: string) => {
      const result = !otherHintsNames.includes(value);

      return result
        ? Promise.resolve()
        : Promise.reject(
            new Error('Same name already used for other ai hints')
          );
    },
    [otherHintsNames]
  );

  const alreadyExistingTriggerValidator = useCallback(
    (value: string, triggerIndex: number) => {
      const otherHintTriggers = (
        form.getFieldValue(formFieldKeys.triggers) as FormFieldsType['triggers']
      )
        .filter((_, index) => index !== triggerIndex)
        .concat(otherHintsTriggers)
        .map((trigger) => trigger.value);
      const result = !otherHintTriggers.includes(value);

      return result
        ? Promise.resolve()
        : Promise.reject(
            new Error(
              'This trigger already presented in other triggers in current or other ai hints'
            )
          );
    },
    [form, otherHintsTriggers]
  );

  const triggersValidator = useCallback(
    (_: unknown, value: FormFieldsType['triggers']) => {
      return value.length > 0
        ? Promise.resolve()
        : Promise.reject(
            new Error('AI Hint should contain at least 1 trigger')
          );
    },
    []
  );

  const handleSave = useCallback(async () => {
    try {
      await form.validateFields({ recursive: true });

      codeEditor?.updateOptions({ theme: codeEditorTheme });
      onSave(form.getFieldsValue());
    } catch {
      /* empty */
    }
  }, [codeEditor, form, onSave]);

  const handleCancel = useCallback(() => {
    if (!isFormChanged || !isProjectEditable) {
      codeEditor?.updateOptions({ theme: codeEditorTheme });
      onCancel();

      return;
    }

    Modal.confirm({
      icon: null,
      title: 'Unsaved changes',
      content: `You have unsaved changes. Are you sure you want to close without saving?`,
      okButtonProps: {
        className: classNames(modalFooterButtonClasses, primaryButtonClasses),
      },
      cancelButtonProps: {
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      },
      onOk: async () => {
        codeEditor?.updateOptions({ theme: codeEditorTheme });
        onCancel();
      },
    });
  }, [codeEditor, isFormChanged, isProjectEditable, onCancel]);

  useEffect(() => {
    codeEditor?.updateOptions({
      readOnly: !isProjectEditable,
    });
  }, [codeEditor, isProjectEditable]);

  useEffect(() => {
    if (!monaco) return;

    registerTheme(monaco, theme, customQuantThemeName);
    codeEditor?.updateOptions({ theme: customQuantThemeName });
  }, [codeEditor, monaco, theme]);

  useEffect(() => {
    if (!isNewHint) {
      form.validateFields({ recursive: true });
    }
  }, [form, isNewHint]);

  return (
    <Modal
      className="min-w-[min(70dvw,1000px)] !px-0"
      destroyOnClose={true}
      footer={
        isProjectEditable ? (
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Tooltip title={isHintDisabled ? 'Enable hint' : 'Disable hint'}>
                <div>
                  <Form.Item
                    getValueProps={(value) => ({
                      value: !value,
                    })}
                    name={formFieldKeys.isDisabled}
                    normalize={(value) => !value}
                    noStyle
                  >
                    <CustomVisibleButton />
                  </Form.Item>
                </div>
              </Tooltip>
              {!isNewHint && (
                <div>
                  <button onClick={() => onDelete()}>
                    <Tooltip title={'Remove hint'}>
                      <Icon
                        className="w-[24px] text-textSecondary hover:text-textAccentPrimary"
                        component={() => <TrashIcon />}
                      />
                    </Tooltip>
                  </button>
                </div>
              )}
            </div>
            <div>
              <Button
                className={classNames(
                  modalFooterButtonClasses,
                  primaryButtonClasses,
                  'h-10'
                )}
                onClick={handleSave}
              >
                {isNewHint ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
        ) : null
      }
      modalRender={(dom) => (
        <Form
          autoComplete="false"
          form={form}
          initialValues={initialFormValues}
          layout={'vertical'}
          requiredMark={customizeRequiredMark}
          validateTrigger={['onBlur', 'onChange']}
        >
          {dom}
        </Form>
      )}
      title={
        !isProjectEditable
          ? 'View AI hint'
          : isNewHint
          ? `Create new AI hint`
          : `Edit AI hint`
      }
      open
      onCancel={handleCancel}
    >
      <div className="flex flex-col gap-3 min-h-[390px] max-h-[67dvh] justify-between overflow-auto thin-scrollbar text-textPrimary pr-4">
        <div>
          {isProjectEditable ? (
            <Form.Item
              label="Name"
              layout="vertical"
              name={formFieldKeys.name}
              rules={[
                {
                  required: true,
                  transform: (value) => value.trim(),
                  message: 'Name cannot be empty or contain only whitespaces',
                },
                {
                  validator: existingHintNameValidator,
                },
              ]}
              validateFirst
            >
              <Input
                className={classNames('!h-[32px]', inputClasses)}
                placeholder="Name of hint"
              />
            </Form.Item>
          ) : (
            <div className="flex gap-1">
              <span className="font-semibold">Name:&nbsp;</span>
              <div>{hintToEdit.name}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 shrink">
            <Form.List
              name={formFieldKeys.triggers}
              rules={[{ validator: triggersValidator }]}
            >
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <div className="flex" key={field.key}>
                      {isProjectEditable ? (
                        <div className="flex flex-col gap-1 size-full">
                          <div className="flex grow">
                            <div className="flex flex-col grow">
                              <Form.Item
                                label={index === 0 ? 'Trigger' : undefined}
                                name={[field.name, triggersFormFieldKeys.value]}
                                rules={[
                                  {
                                    transform: (value) => value.trim(),
                                    required: true,
                                    message:
                                      'Trigger cannot be empty or contain only whitespaces',
                                  },
                                  {
                                    validator: (_, value) =>
                                      alreadyExistingTriggerValidator(
                                        value,
                                        index
                                      ),
                                  },
                                ]}
                                validateFirst
                              >
                                <Input.TextArea
                                  autoSize={{ minRows: 1 }}
                                  className={classNames(
                                    'h-[38px]',
                                    inputClasses
                                  )}
                                  placeholder="Trigger"
                                />
                              </Form.Item>
                            </div>
                            <div
                              className={classNames(
                                'ml-2 flex gap-1 h-[24px] my-1',
                                index === 0 && 'mt-7'
                              )}
                            >
                              <Tooltip
                                title={
                                  formValues?.[formFieldKeys.triggers][
                                    field.key
                                  ][triggersFormFieldKeys.isDisabled]
                                    ? 'Enable trigger'
                                    : 'Disable trigger'
                                }
                              >
                                <div>
                                  <Form.Item
                                    getValueProps={(value) => ({
                                      value: !value,
                                    })}
                                    name={[
                                      field.name,
                                      triggersFormFieldKeys.isDisabled,
                                    ]}
                                    normalize={(value) => !value}
                                    noStyle
                                  >
                                    <CustomVisibleButton />
                                  </Form.Item>
                                </div>
                              </Tooltip>
                              <Tooltip title="Remove trigger">
                                <div className="h-[24px] flex items-center">
                                  <button
                                    className="h-full"
                                    onClick={() => {
                                      remove(index);

                                      if (fields.length !== 1) return;

                                      const addedItem: FormFieldsType['triggers'][0] =
                                        {
                                          value: '',
                                          isDisabled: false,
                                        };
                                      add(addedItem);
                                    }}
                                  >
                                    <Icon
                                      className="w-[24px] text-textSecondary hover:text-textAccentPrimary"
                                      component={() => <TrashIcon />}
                                    />
                                  </button>
                                </div>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <span className="font-semibold text-nowrap">
                            <span className="flex gap-1 items-center">
                              <CustomVisibleButton
                                value={
                                  !formValues?.[formFieldKeys.triggers][
                                    field.key
                                  ][triggersFormFieldKeys.isDisabled]
                                }
                              />
                              Trigger {index + 1}:&nbsp;
                            </span>
                          </span>
                          <div className="">
                            {form.getFieldValue([
                              formFieldKeys.triggers,
                              field.name,
                              triggersFormFieldKeys.value,
                            ])}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isProjectEditable && (
                    <div>
                      <button
                        className="flex items-center text-textAccentPrimary hover:bg-bgAccentPrimaryAlpha py-1 px-2 rounded"
                        onClick={() => {
                          const addedItem: FormFieldsType['triggers'][0] = {
                            value: '',
                            isDisabled: false,
                          };
                          add(addedItem);
                        }}
                      >
                        <Icon
                          className="w-[12px] mr-2 text-textAccentPrimary group-disabled:stroke-controlsTextDisable"
                          component={() => <PlusIcon />}
                        />
                        <span>Add new trigger</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </Form.List>
          </div>
        </div>
        <div className="grow max-h-full">
          <Form.Item
            label="Suggestion"
            name={formFieldKeys.suggestion}
            rules={[
              {
                required: true,
                transform: (value) => value.trim(),
                message:
                  'Suggestion cannot be empty or contain only whitespaces',
              },
            ]}
          >
            <Editor
              className="h-[360px] bg-bgLayer3 border border-strokePrimary"
              defaultLanguage="markdown"
              options={{
                ...codeEditorOptions,
                readOnly: !isProjectEditable,
              }}
              theme={codeEditorTheme}
              onMount={onCodeEditorMount}
            />
          </Form.Item>
        </div>
      </div>
    </Modal>
  );
};
