import { describe, expect, it } from 'vitest';
import { parseEstimate } from './gemini';

const wrap = (o: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] });

describe('gemini estimate parsing', () => {
  it('reads a range', () => {
    expect(parseEstimate(wrap({ low: 600, high: 800, components: ['rice'] }))).toEqual({ low: 600, high: 800, components: ['rice'] });
  });
  it('never returns a point value', () => {
    const r = parseEstimate(wrap({ low: 500, high: 500, components: [] }));
    expect(r.high).toBeGreaterThan(r.low);
  });
  it('orders a reversed range', () => {
    expect(parseEstimate(wrap({ low: 900, high: 700, components: [] }))).toMatchObject({ low: 700, high: 900 });
  });
  it('throws on garbage', () => {
    expect(() => parseEstimate({})).toThrow();
  });
});
