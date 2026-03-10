// Copy of antd description template implementation, but with inner html set
// node_modules/@rjsf/antd/src/templates/DescriptionField/index.tsx

import DOMPurify from 'dompurify';

import {
  DescriptionFieldProps,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
} from '@rjsf/utils';

/** The `DescriptionTemplate` is the template to use to render the description of a field
 *
 * @param props - The `FieldProps` for this component
 */
export function DescriptionTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: DescriptionFieldProps<T, S, F>) {
  const { id, description } = props;
  if (!description) {
    return null;
  }

  return (
    <span
      dangerouslySetInnerHTML={
        typeof description === 'string'
          ? { __html: DOMPurify.sanitize(description) }
          : undefined
      }
      id={id}
    >
      {typeof description !== 'string' ? description : null}
    </span>
  );
}
