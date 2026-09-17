import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCharge } from '../src/services/billingService';

const start = new Date('2026-01-01T10:00:00.000Z');

test('charges one first hour for a session shorter than one hour', () => {
  const result = calculateCharge(start, new Date('2026-01-01T10:30:00.000Z'), { firstHourRate: 5, additionalHourRate: 3, dailyCap: 30 });
  assert.deepEqual(result, { elapsedHours: 1, amount: 5 });
});

test('rounds partial hours up and applies additional hourly pricing', () => {
  const result = calculateCharge(start, new Date('2026-01-01T12:01:00.000Z'), { firstHourRate: 5, additionalHourRate: 3, dailyCap: 30 });
  assert.deepEqual(result, { elapsedHours: 3, amount: 11 });
});

test('never exceeds the configured daily cap', () => {
  const result = calculateCharge(start, new Date('2026-01-02T12:00:00.000Z'), { firstHourRate: 5, additionalHourRate: 3, dailyCap: 20 });
  assert.equal(result.amount, 20);
});

test('guards negative elapsed time as a one-hour charge', () => {
  const result = calculateCharge(start, new Date('2026-01-01T09:00:00.000Z'), { firstHourRate: 5, additionalHourRate: 3, dailyCap: 30 });
  assert.deepEqual(result, { elapsedHours: 1, amount: 5 });
});
