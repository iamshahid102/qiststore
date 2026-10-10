/**
 * Money helpers. Rule: all monetary values are integers in PAISA (Rs 1 = 100 paisa).
 * Never use floats for money — this is the #1 source of e-commerce billing bugs.
 */

export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paisaToRupees(paisa: number): number {
  return paisa / 100;
}

export function formatRs(paisa: number): string {
  return `Rs. ${paisaToRupees(paisa).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}
