/** Format paisa integer as PKR currency string. */
export function formatRs(paisa: number): string {
  return `Rs. ${Math.round(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}
