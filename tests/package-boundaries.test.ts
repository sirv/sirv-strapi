import { describe, expect, it } from 'vitest';
// @ts-expect-error - plain .mjs script without types
import { findStrapiImports } from '../scripts/check-package-boundaries.mjs';

describe('package boundaries', () => {
  it('packages/* contains no @strapi/* imports (host-agnostic guarantee)', () => {
    const violations = findStrapiImports();
    expect(violations).toEqual([]);
  });
});
