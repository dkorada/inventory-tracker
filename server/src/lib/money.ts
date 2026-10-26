/** Convert a decimal amount (e.g. 12.5) into integer cents (1250). */
export const toCents = (amount: number) => Math.round(amount * 100);

/** Convert integer cents back into a decimal amount for API responses. */
export const fromCents = (cents: number) => Math.round(cents) / 100;
