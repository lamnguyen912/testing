
import { MemberSummary, TaskItem, Release } from './types';

/**
 * MIGRATION GUIDE:
 * To use your real data, you can either:
 * 1. Edit the arrays below directly.
 * 2. Use the "Data Migration" tool in the "History" tab of the app to import CSV.
 */

export const releases: Release[] = [
  { id: 'r54', name: 'R54', startDate: '2026-01-07', endDate: '2026-01-20', status: 'Active' },
];

export const members: MemberSummary[] = [
  { release: 'R54', member: 'Anh Nguyen', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
  { release: 'R54', member: 'Quoc Le', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
  { release: 'R54', member: 'Hanh Ngo', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
  { release: 'R54', member: 'Lam Nguyen', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
  { release: 'R54', member: 'Trung Tran', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
  { release: 'R54', member: 'Tuan Tran', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
  { release: 'R54', member: 'Bao Thai', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
  { release: 'R54', member: 'Tien Tran', tickets: 0, loeDays: 0, loeDoneDays: 0, loeRemainingDays: 0, maxCapacity: 10 },
];

// Initial tasks can be empty or keep examples
export const tasks: TaskItem[] = [];
