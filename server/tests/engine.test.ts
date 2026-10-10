import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TERMS,
  assertTransition,
  buildSchedule,
  canTransition,
  computePlan,
  generateOrderNumber,
  isTerm,
} from '../src/modules/engine/installment.js';

const PAISA = (rs: number) => rs * 100;

describe('computePlan', () => {
  it('computes totalPayable = advance + monthly * term', () => {
    const plan = computePlan(PAISA(50000), { term: 12, advance: PAISA(15000), monthly: PAISA(4000) });
    expect(plan.totalPayable).toBe(PAISA(15000) + PAISA(4000) * 12);
    expect(plan.markup).toBe(plan.totalPayable - PAISA(50000));
  });

  it('rejects advance below 10% of cash price', () => {
    expect(() => computePlan(PAISA(50000), { term: 6, advance: PAISA(4000), monthly: PAISA(9000) })).toThrow(/below the minimum/);
  });

  it('rejects invalid terms', () => {
    expect(() => computePlan(PAISA(50000), { term: 7 as never, advance: PAISA(15000), monthly: PAISA(5000) })).toThrow(/term/);
    expect(isTerm(12)).toBe(true);
    expect(isTerm(7)).toBe(false);
    expect(ALLOWED_TERMS).toContain(24);
  });

  it('rejects non-integer money (floats must never pass)', () => {
    expect(() => computePlan(50000.5, { term: 6, advance: PAISA(15000), monthly: PAISA(5000) })).toThrow(/integer/);
    expect(() => computePlan(PAISA(50000), { term: 6, advance: 1500.55, monthly: PAISA(5000) })).toThrow();
  });

  it('computes markup percent rounded to 2 decimals', () => {
    const plan = computePlan(PAISA(100000), { term: 12, advance: PAISA(30000), monthly: PAISA(7500) });
    // total = 30000 + 7500*12 = 120000 -> markup 20%
    expect(plan.markupPercent).toBe(20);
  });
});

describe('buildSchedule', () => {
  it('schedule sums EXACTLY to monthly * term (invariant)', () => {
    const schedule = buildSchedule(new Date('2026-01-15T10:00:00Z'), 12, PAISA(4133));
    expect(schedule).toHaveLength(12);
    const sum = schedule.reduce((s, e) => s + e.amount, 0);
    expect(sum).toBe(PAISA(4133) * 12);
  });

  it('first due date is ~firstDueAfterDays after order, rest monthly', () => {
    const orderDate = new Date('2026-01-15T10:00:00Z');
    const schedule = buildSchedule(orderDate, 6, PAISA(5000), 30);
    const first = new Date(schedule[0]!.dueDate);
    expect(first.getTime()).toBeGreaterThan(orderDate.getTime());
    expect(first.getTime() - orderDate.getTime()).toBeGreaterThanOrEqual(29 * 86400000);
    // monotonic due dates
    for (let i = 1; i < schedule.length; i++) {
      expect(new Date(schedule[i]!.dueDate).getTime()).toBeGreaterThan(new Date(schedule[i - 1]!.dueDate).getTime());
    }
  });

  it('last installment absorbs rounding remainder', () => {
    const schedule = buildSchedule(new Date(), 3, 10007); // not round-friendly
    const sum = schedule.reduce((s, e) => s + e.amount, 0);
    expect(sum).toBe(10007 * 3);
    expect(schedule.every((e) => e.amount > 0)).toBe(true);
  });
});

describe('order state machine', () => {
  it('allows the happy path', () => {
    expect(canTransition('pending_verification', 'verification_in_progress')).toBe(true);
    expect(canTransition('verification_in_progress', 'approved')).toBe(true);
    expect(canTransition('approved', 'processing')).toBe(true);
    expect(canTransition('processing', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);
    expect(canTransition('delivered', 'completed')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('pending_verification', 'shipped')).toBe(false);
    expect(canTransition('cancelled', 'processing')).toBe(false);
    expect(canTransition('completed', 'delivered')).toBe(false);
    expect(canTransition('rejected', 'approved')).toBe(false);
    expect(() => assertTransition('cancelled', 'processing')).toThrow(/Illegal order transition/);
  });

  it('supports the business rule: cancel only before verification approval', () => {
    expect(canTransition('pending_verification', 'cancelled')).toBe(true);
    expect(canTransition('verification_in_progress', 'cancelled')).toBe(true);
    expect(canTransition('approved', 'cancelled')).toBe(true); // approved but not yet processing
    expect(canTransition('processing', 'cancelled')).toBe(false);
  });
});

describe('generateOrderNumber', () => {
  it('formats QST-YYYY-NNNNNN', () => {
    expect(generateOrderNumber(new Date('2026-06-01'), 42)).toBe('QST-2026-000042');
    expect(generateOrderNumber(new Date('2026-06-01'), 123456)).toBe('QST-2026-123456');
  });
});
