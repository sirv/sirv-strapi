import type { BrowseType } from '@sirv/core';
import { buildUrl } from '@sirv/url-builder';
import { Box, Button, Field, Flex, Typography } from '@strapi/design-system';
import { ArrowClockwise, Trash } from '@strapi/icons';
import { forwardRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { DamBrowserModal } from '../../components/DamBrowserModal';
import { getTranslation } from '../../getTranslation';
import { type SirvFieldValue, describeFieldValue } from './value';

interface SirvMediaInputProps {
  name: string;
  value?: string | null;
  onChange: (event: { target: { name: string; value: unknown; type?: string } }) => void;
  attribute?: { type?: string; options?: { allowedTypes?: BrowseType[] } };
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  intlLabel?: { id: string; defaultMessage: string };
}

/** Best-effort parse of the stored value (arrives as a JSON string for `type: 'json'`). */
function parseValue(value?: string | null): SirvFieldValue | null {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && '_type' in parsed
      ? (parsed as SirvFieldValue)
      : null;
  } catch {
    return null;
  }
}

/** Small preview thumbnail for a stored value (image/video/spin have one; views do not). */
function previewThumb(value: SirvFieldValue): string | null {
  const input = { alias: value.asset.sirvAlias, path: value.asset.sirvPath };
  switch (value._type) {
    case 'sirv.image':
      return buildUrl(input, { width: 160, height: 160, scale: 'fit', format: 'optimal' });
    case 'sirv.video':
      return buildUrl(input, { extras: { thumbnail: 160 } });
    case 'sirv.spin':
      return buildUrl(input, { width: 160, height: 160, extras: { image: 24 } });
    default:
      return null;
  }
}

/**
 * The `sirv-media` field input. Empty -> "Pick from Sirv" opens the DAM browser modal. Filled ->
 * a preview with Change / Remove. The picked `SirvFieldValue` is stored as JSON.
 */
const SirvMediaInput = forwardRef<HTMLButtonElement, SirvMediaInputProps>((props, ref) => {
  const { name, value, onChange, attribute, disabled, required, error, hint, intlLabel } = props;
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);

  const current = parseValue(value);
  const allowedTypes = attribute?.options?.allowedTypes;
  const label = intlLabel
    ? formatMessage(intlLabel)
    : formatMessage({ id: getTranslation('sirv-media.label'), defaultMessage: 'Sirv media' });

  const emit = (next: SirvFieldValue | null) => {
    onChange({
      target: { name, value: next ? JSON.stringify(next) : null, type: attribute?.type ?? 'json' },
    });
  };

  const thumb = current ? previewThumb(current) : null;

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>

      {current ? (
        <Flex
          alignItems="center"
          gap={4}
          padding={3}
          hasRadius
          background="neutral0"
          borderColor="neutral200"
        >
          <Flex
            alignItems="center"
            justifyContent="center"
            background="neutral100"
            hasRadius
            style={{ width: 80, height: 80, overflow: 'hidden', flexShrink: 0 }}
          >
            {thumb ? (
              <img
                src={thumb}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Typography variant="pi" textColor="neutral500">
                {current._type.replace('sirv.', '')}
              </Typography>
            )}
          </Flex>
          <Flex direction="column" alignItems="flex-start" gap={1} flex={1} style={{ minWidth: 0 }}>
            <Typography ellipsis>{describeFieldValue(current)}</Typography>
            <Typography variant="pi" textColor="neutral600" ellipsis>
              {current.asset.sirvPath}
            </Typography>
          </Flex>
          <Flex gap={2}>
            <Button
              ref={ref}
              type="button"
              variant="secondary"
              startIcon={<ArrowClockwise />}
              disabled={disabled}
              onClick={() => setOpen(true)}
            >
              Change
            </Button>
            <Button
              type="button"
              variant="danger-light"
              startIcon={<Trash />}
              disabled={disabled}
              onClick={() => emit(null)}
            >
              Remove
            </Button>
          </Flex>
        </Flex>
      ) : (
        <Box>
          <Button
            ref={ref}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            {formatMessage({
              id: getTranslation('sirv-media.button.pick'),
              defaultMessage: 'Pick from Sirv',
            })}
          </Button>
        </Box>
      )}

      <Field.Hint />
      <Field.Error />

      <DamBrowserModal
        open={open}
        onOpenChange={setOpen}
        allowedTypes={allowedTypes}
        onPicked={emit}
      />
    </Field.Root>
  );
});

SirvMediaInput.displayName = 'SirvMediaInput';

export { SirvMediaInput };
export default SirvMediaInput;
