import type { BrowseType } from '@sirv/core';
import { buildUrl } from '@sirv/url-builder';
import { Box, Button, Field, Flex, Typography } from '@strapi/design-system';
import { ArrowClockwise, Plus, Trash } from '@strapi/icons';
import { forwardRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { DamBrowserModal } from '../../components/DamBrowserModal';
import { getTranslation } from '../../getTranslation';
import { type SirvFieldValue, describeFieldValue } from './value';

interface SirvMediaInputProps {
  name: string;
  /** Field label supplied by the content-manager (the attribute's display name). */
  label?: string;
  value?: string | null;
  onChange: (event: { target: { name: string; value: unknown; type?: string } }) => void;
  attribute?: { type?: string; options?: { allowedTypes?: BrowseType[]; multiple?: boolean } };
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  intlLabel?: { id: string; defaultMessage: string };
}

/** Turns an attribute path like `anyMedia` / `hero.image` into a readable label ("Any media"). */
function humanizeName(name: string): string {
  const seg = name.split('.').pop() ?? name;
  const spaced = seg
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : 'Sirv media';
}

function isFieldValue(v: unknown): v is SirvFieldValue {
  return !!v && typeof v === 'object' && '_type' in (v as Record<string, unknown>);
}

/** Parse a single stored value (JSON string for `type: 'json'`). */
function parseValue(value?: string | null): SirvFieldValue | null {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return isFieldValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Parse a stored list value (JSON array of field values). */
function parseList(value?: string | null): SirvFieldValue[] {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(isFieldValue) : [];
  } catch {
    return [];
  }
}

/** Small preview thumbnail for a stored value. */
function previewThumb(value: SirvFieldValue): string | null {
  const input = { alias: value.asset.sirvAlias, path: value.asset.sirvPath };
  switch (value._type) {
    case 'sirv.image':
      return buildUrl(input, { width: 160, height: 160, scale: 'fit', format: 'optimal' });
    case 'sirv.video':
      return `${buildUrl(input)}?thumbnail=160`;
    case 'sirv.spin':
      return buildUrl(input, { width: 160, height: 160, extras: { image: 24 } });
    case 'sirv.view':
      return `${buildUrl(input)}?thumb`;
    default:
      return null;
  }
}

function Thumb({ value, size = 80 }: { value: SirvFieldValue; size?: number }) {
  const src = previewThumb(value);
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      background="neutral100"
      hasRadius
      style={{ width: size, height: size, overflow: 'hidden', flexShrink: 0 }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      ) : (
        <Typography variant="pi" textColor="neutral500">
          {value._type.replace('sirv.', '')}
        </Typography>
      )}
    </Flex>
  );
}

/**
 * The `sirv-media` field input. Single by default; with `options.multiple` it manages a gallery
 * (array) of assets. Picked `SirvFieldValue`s are stored as JSON.
 */
const SirvMediaInput = forwardRef<HTMLButtonElement, SirvMediaInputProps>((props, ref) => {
  const {
    name,
    label: labelProp,
    value,
    onChange,
    attribute,
    disabled,
    required,
    error,
    hint,
    intlLabel,
  } = props;
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);

  const multiple = Boolean(attribute?.options?.multiple);
  const allowedTypes = attribute?.options?.allowedTypes;
  const type = attribute?.type ?? 'json';
  const label = labelProp ?? (intlLabel ? formatMessage(intlLabel) : humanizeName(name));

  const emit = (next: unknown) => {
    onChange({ target: { name, value: next == null ? null : JSON.stringify(next), type } });
  };

  const pickLabel = formatMessage({
    id: getTranslation('sirv-media.button.pick'),
    defaultMessage: 'Pick from Sirv',
  });

  // --- Multiple (gallery) ---
  if (multiple) {
    const list = parseList(value);
    const removeAt = (i: number) => {
      const next = list.filter((_, idx) => idx !== i);
      emit(next.length ? next : null);
    };
    return (
      <Field.Root name={name} error={error} hint={hint} required={required}>
        <Field.Label>{label}</Field.Label>
        <Flex direction="column" alignItems="stretch" gap={3}>
          {list.length ? (
            <Flex gap={3} wrap="wrap">
              {list.map((item, i) => (
                <Flex
                  key={`${item.asset.sirvPath}-${i}`}
                  direction="column"
                  alignItems="center"
                  gap={2}
                  padding={2}
                  hasRadius
                  background="neutral0"
                  borderColor="neutral200"
                  style={{ width: 120 }}
                >
                  <Thumb value={item} />
                  <Typography variant="pi" ellipsis style={{ maxWidth: 104 }}>
                    {item.asset.sirvPath.split('/').pop()}
                  </Typography>
                  <Button
                    type="button"
                    size="S"
                    variant="danger-light"
                    startIcon={<Trash />}
                    disabled={disabled}
                    onClick={() => removeAt(i)}
                  >
                    Remove
                  </Button>
                </Flex>
              ))}
            </Flex>
          ) : null}
          <Box>
            <Button
              ref={ref}
              type="button"
              variant="secondary"
              startIcon={<Plus />}
              disabled={disabled}
              onClick={() => setOpen(true)}
            >
              Add from Sirv
            </Button>
          </Box>
        </Flex>
        <Field.Hint />
        <Field.Error />
        <DamBrowserModal
          open={open}
          onOpenChange={setOpen}
          allowedTypes={allowedTypes}
          multiple
          onPickedMany={(values) => emit([...list, ...values])}
        />
      </Field.Root>
    );
  }

  // --- Single ---
  const current = parseValue(value);
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
          <Thumb value={current} />
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
            {pickLabel}
          </Button>
        </Box>
      )}
      <Field.Hint />
      <Field.Error />
      <DamBrowserModal
        open={open}
        onOpenChange={setOpen}
        allowedTypes={allowedTypes}
        onPicked={(v) => emit(v)}
      />
    </Field.Root>
  );
});

SirvMediaInput.displayName = 'SirvMediaInput';

export { SirvMediaInput };
export default SirvMediaInput;
