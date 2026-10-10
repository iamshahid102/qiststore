/**
 * Installment engine — PURE functions, no DB/IO.
 * All money values are integers in PAISA.
 *
 * A plan = advance (paid at checkout) + fixed monthly payment for `term` months.
 *   totalPayable = advance + monthly * term
 *   markup       = totalPayable - cashPrice   (cost-plus "Musawamah" margin; shown as total on UI)
 */

export const ALLOWED_TERMS = [3, 6, 9, 12, 18, 24] as const;
export type Term = (typeof ALLOWED_TERMS)[number];

export interface PlanOption {
  term: Term;
  advance: number; // paisa
  monthly: number; // paisa
}

export interface ComputedPlan extends PlanOption {
  totalPayable: number;
  markup: number;
  markupPercent: number; // internal reporting only — never labelled "interest" in UI
}

export interface ScheduleEntry {
  installmentNo: number; // 1..term
  dueDate: string; // ISO date
  amount: number; // paisa
  status: 'upcoming';
}

export function isTerm(value: number): value is Term {
  return (ALLOWED_TERMS as readonly number[]).includes(value);
}

/** Compute totals for a plan against a product's cash price. */
export function computePlan(cashPrice: number, plan: PlanOption): ComputedPlan {
  validatePlanInput(cashPrice, plan);
  const totalPayable = plan.advance + plan.monthly * plan.term;
  const markup = totalPayable - cashPrice;
  const markupPercent = cashPrice > 0 ? (markup / cashPrice) * 100 : 0;
  return { ...plan, totalPayable, markup, markupPercent: Math.round(markupPercent * 100) / 100 };
}

function validatePlanInput(cashPrice: number, plan: PlanOption): void {
  if (!Number.isInteger(cashPrice) || cashPrice <= 0) {
    throw new Error(`cashPrice must be a positive integer (paisa), got ${cashPrice}`);
  }
  if (!isTerm(plan.term)) {
    throw new Error(`term must be one of ${ALLOWED_TERMS.join(', ')}, got ${plan.term}`);
  }
  if (!Number.isInteger(plan.advance) || plan.advance < 0) {
    throw new Error(`advance must be a non-negative integer (paisa), got ${plan.advance}`);
  }
  if (!Number.isInteger(plan.monthly) || plan.monthly <= 0) {
    throw new Error(`monthly must be a positive integer (paisa), got ${plan.monthly}`);
  }
  // Advance must at least cover a sane minimum margin (10% of cash price) to reduce default risk.
  if (plan.advance < Math.floor(cashPrice * 0.1)) {
    throw new Error('advance is below the minimum 10% of cash price');
  }
  if (plan.advance >= cashPrice * 2) {
    throw new Error('advance is implausibly high relative to cash price');
  }
}

/**
 * Build the month-by-month schedule starting the month AFTER the order date.
 * Last installment absorbs any remainder so the schedule sums EXACTLY to
 * monthly * term (invariant: Σ amounts === totalMonthly).
 */
export function buildSchedule(
  orderDate: Date,
  term: Term,
  monthly: number,
  firstDueAfterDays = 30,
): ScheduleEntry[] {
  if (!Number.isInteger(monthly) || monthly <= 0) {
    throw new Error('monthly must be a positive integer (paisa)');
  }
  const totalMonthly = monthly * term;
  const entries: ScheduleEntry[] = [];
  let allocated = 0;

  for (let i = 1; i <= term; i++) {
    const due = new Date(orderDate.getTime());
    if (i === 1) {
      due.setDate(due.getDate() + firstDueAfterDays);
    } else {
      due.setMonth(due.getMonth() + (i - 1));
      due.setDate(due.getDate() + firstDueAfterDays);
    }
    const isLast = i === term;
    const amount = isLast ? totalMonthly - allocated : monthly;
    allocated += amount;
    entries.push({
      installmentNo: i,
      dueDate: due.toISOString(),
      amount,
      status: 'upcoming',
    });
  }

  if (entries.reduce((sum, e) => sum + e.amount, 0) !== totalMonthly) {
    throw new Error('schedule invariant violated: amounts do not sum to monthly * term');
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Order state machine
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'pending_verification',
  'verification_in_progress',
  'approved',
  'rejected',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'defaulted',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_verification: ['verification_in_progress', 'approved', 'rejected', 'cancelled'],
  verification_in_progress: ['approved', 'rejected', 'cancelled'],
  approved: ['processing', 'cancelled'],
  rejected: [],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed', 'defaulted'],
  completed: [],
  cancelled: [],
  defaulted: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal order transition: ${from} -> ${to}`);
  }
}

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Human-readable order number, e.g. QST-2026-000423 */
export function generateOrderNumber(date: Date, seq: number): string {
  const year = date.getFullYear();
  return `QST-${year}-${String(seq).padStart(6, '0')}`;
}
