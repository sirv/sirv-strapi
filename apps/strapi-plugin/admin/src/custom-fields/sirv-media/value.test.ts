import type { DamAsset } from '@sirv/core/types';
import { describe, expect, it } from 'vitest';
import { damAssetToFieldValue, describeFieldValue } from './value';

const asset = (over: Partial<DamAsset>): DamAsset => ({
  type: 'image',
  path: '/products/shoe.jpg',
  name: 'shoe.jpg',
  bytes: 1234,
  ...over,
});

describe('damAssetToFieldValue', () => {
  it('builds a sirv.image value with dimensions and originalUrl', () => {
    const v = damAssetToFieldValue(
      asset({ type: 'image', width: 800, height: 600 }),
      'igor.sirv.com',
    );
    expect(v).toMatchObject({
      _type: 'sirv.image',
      asset: {
        sirvPath: '/products/shoe.jpg',
        sirvAlias: 'igor.sirv.com',
        originalUrl: 'https://igor.sirv.com/products/shoe.jpg',
        bytes: 1234,
        width: 800,
        height: 600,
        format: 'jpg',
      },
    });
  });

  it('builds a sirv.video value with controls', () => {
    const v = damAssetToFieldValue(
      asset({ type: 'video', path: '/a/clip.mp4', name: 'clip.mp4', durationSec: 12 }),
      'igor.sirv.com',
    );
    expect(v._type).toBe('sirv.video');
    if (v._type === 'sirv.video') {
      expect(v.controls).toBe(true);
      expect(v.asset.durationSec).toBe(12);
      expect(v.asset.format).toBe('mp4');
    }
  });

  it('builds spin and view values', () => {
    expect(
      damAssetToFieldValue(asset({ type: 'spin', path: '/s/x.spin', name: 'x.spin' }), 'a')._type,
    ).toBe('sirv.spin');
    expect(
      damAssetToFieldValue(asset({ type: 'view', path: '/v/y.view', name: 'y.view' }), 'a')._type,
    ).toBe('sirv.view');
  });

  it('rejects generic files', () => {
    expect(() => damAssetToFieldValue(asset({ type: 'file' }), 'a')).toThrow(/Sirv media/);
  });

  it('omits dimensions when the asset lacks them', () => {
    const v = damAssetToFieldValue(asset({ type: 'image' }), 'a');
    if (v._type === 'sirv.image') {
      expect(v.asset.width).toBeUndefined();
      expect(v.asset.height).toBeUndefined();
    }
  });
});

describe('describeFieldValue', () => {
  it('summarizes type and basename', () => {
    const v = damAssetToFieldValue(
      asset({ type: 'image', path: '/a/b/pic.png', name: 'pic.png' }),
      'a',
    );
    expect(describeFieldValue(v)).toBe('image - pic.png');
  });
});
