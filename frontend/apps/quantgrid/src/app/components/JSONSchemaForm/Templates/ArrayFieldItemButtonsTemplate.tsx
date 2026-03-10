import {
  ArrayFieldItemButtonsTemplateProps,
  buttonId,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
} from '@rjsf/utils';

/** Stable component for array item buttons (imported in ArrayFieldItemTemplate to avoid
 * "Cannot create components during render" from getTemplate() inside render).
 * Uses registry.templates.ButtonTemplates (our overridden Copy/MoveUp/MoveDown/RemoveButton).
 */
export function ArrayFieldItemButtonsTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: ArrayFieldItemButtonsTemplateProps<T, S, F>) {
  const {
    disabled,
    fieldPathId,
    hasCopy,
    hasMoveDown,
    hasMoveUp,
    hasRemove,
    onCopyItem,
    onMoveDownItem,
    onMoveUpItem,
    onRemoveItem,
    readonly,
    registry,
    style,
    uiSchema,
  } = props;
  const { CopyButton, MoveDownButton, MoveUpButton, RemoveButton } =
    registry.templates.ButtonTemplates;

  return (
    <>
      {(hasMoveUp || hasMoveDown) && (
        <MoveUpButton
          className="rjsf-array-item-move-up"
          disabled={disabled || readonly || !hasMoveUp}
          id={buttonId(fieldPathId, 'moveUp')}
          registry={registry}
          style={style}
          uiSchema={uiSchema}
          onClick={onMoveUpItem}
        />
      )}
      {(hasMoveUp || hasMoveDown) && (
        <MoveDownButton
          className="rjsf-array-item-move-down"
          disabled={disabled || readonly || !hasMoveDown}
          id={buttonId(fieldPathId, 'moveDown')}
          registry={registry}
          style={style}
          uiSchema={uiSchema}
          onClick={onMoveDownItem}
        />
      )}
      {hasCopy && (
        <CopyButton
          className="rjsf-array-item-copy"
          disabled={disabled || readonly}
          id={buttonId(fieldPathId, 'copy')}
          registry={registry}
          style={style}
          uiSchema={uiSchema}
          onClick={onCopyItem}
        />
      )}
      {hasRemove && (
        <RemoveButton
          className="rjsf-array-item-remove"
          disabled={disabled || readonly}
          id={buttonId(fieldPathId, 'remove')}
          registry={registry}
          style={style}
          uiSchema={uiSchema}
          onClick={onRemoveItem}
        />
      )}
    </>
  );
}
