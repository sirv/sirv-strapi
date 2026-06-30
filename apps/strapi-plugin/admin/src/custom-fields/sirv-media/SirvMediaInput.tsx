import { Button, Field, Flex, Typography } from '@strapi/design-system';
import { forwardRef } from 'react';
import { useIntl } from 'react-intl';
import { getTranslation } from '../../getTranslation';

/**
 * Props passed by Strapi's content-manager to a custom-field Input. Strapi wraps the
 * component with `forwardRef`; `onChange` expects a synthetic `{ target: { name, value, type } }`.
 */
interface SirvMediaInputProps {
  name: string;
  value?: string | null;
  onChange: (event: { target: { name: string; value: unknown; type?: string } }) => void;
  attribute?: { type: string; customField?: string; options?: Record<string, unknown> };
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  intlLabel?: { id: string; defaultMessage: string };
}

/**
 * The `sirv-media` field input. Milestone 1 renders a disabled "Pick from Sirv" button and
 * echoes any stored value. Milestone 5 opens the DAM browser modal (from `@sirv/core`) on
 * click and calls `onChange` with the selected `SirvFieldValue`.
 */
const SirvMediaInput = forwardRef<HTMLButtonElement, SirvMediaInputProps>((props, ref) => {
  const { name, value, disabled, required, error, hint, intlLabel } = props;
  const { formatMessage } = useIntl();

  const label = intlLabel
    ? formatMessage(intlLabel)
    : formatMessage({ id: getTranslation('sirv-media.label'), defaultMessage: 'Sirv media' });

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>
      <Flex direction="column" alignItems="stretch" gap={2}>
        <Button ref={ref} variant="secondary" disabled={disabled}>
          {formatMessage({
            id: getTranslation('sirv-media.button.pick'),
            defaultMessage: 'Pick from Sirv',
          })}
        </Button>
        {value ? (
          <Typography variant="pi" textColor="neutral600">
            {typeof value === 'string' ? value : JSON.stringify(value)}
          </Typography>
        ) : null}
      </Flex>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
});

SirvMediaInput.displayName = 'SirvMediaInput';

export { SirvMediaInput };
export default SirvMediaInput;
