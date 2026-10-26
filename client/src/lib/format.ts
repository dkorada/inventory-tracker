const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat('en-US');

export const formatMoney = (n: number) => currency.format(n);
export const formatMoneyCompact = (n: number) => compactCurrency.format(n);
export const formatNumber = (n: number) => number.format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** "3 hours ago", "2 days ago" — falls back to a date after a week. */
export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

export const margin = (cost: number, sale: number) => (sale > 0 ? ((sale - cost) / sale) * 100 : 0);

export const signed = (n: number) => (n > 0 ? `+${formatNumber(n)}` : formatNumber(n));
