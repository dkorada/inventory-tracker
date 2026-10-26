/**
 * Seeds the database with a realistic (but entirely fictional) catalogue for
 * "Maple Street Market", a small neighbourhood grocery & convenience store,
 * plus ~60 days of stock movement history.
 *
 * The history is simulated deterministically (seeded PRNG), so every run
 * produces the same data: steady daily sales, restocks when stock reaches the
 * reorder level, the occasional adjustment, and a handful of items that were
 * not restocked in time so the low-stock alerts have something to show.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Beverages', color: '#0ea5e9' },
  { name: 'Snacks', color: '#f59e0b' },
  { name: 'Dairy & Eggs', color: '#8b5cf6' },
  { name: 'Bakery', color: '#d97706' },
  { name: 'Pantry', color: '#10b981' },
  { name: 'Household', color: '#64748b' },
  { name: 'Personal Care', color: '#ec4899' },
];

interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  cost: number;
  sale: number;
  reorder: number;
  /** Average units sold per day. */
  daily: number;
  /** Units ordered on each restock. */
  lot: number;
  /** If set, the shop stopped restocking this item N days ago (drives low-stock alerts). */
  neglectedFor?: number;
  description?: string;
}

const products: SeedProduct[] = [
  {
    sku: 'BEV-1001',
    name: 'Sparkling Water 500ml',
    category: 'Beverages',
    cost: 0.45,
    sale: 1.2,
    reorder: 24,
    daily: 6,
    lot: 96,
    description: 'Natural mineral water, lightly carbonated.',
  },
  {
    sku: 'BEV-1002',
    name: 'Cold Brew Coffee 250ml',
    category: 'Beverages',
    cost: 1.35,
    sale: 3.5,
    reorder: 12,
    daily: 3,
    lot: 48,
  },
  {
    sku: 'BEV-1003',
    name: 'Orange Juice 1L',
    category: 'Beverages',
    cost: 1.6,
    sale: 3.25,
    reorder: 10,
    daily: 2.5,
    lot: 36,
    neglectedFor: 9,
  },
  {
    sku: 'BEV-1004',
    name: 'Green Tea (20 bags)',
    category: 'Beverages',
    cost: 1.9,
    sale: 4.49,
    reorder: 8,
    daily: 0.8,
    lot: 24,
  },
  {
    sku: 'BEV-1005',
    name: 'Cola Classic 330ml Can',
    category: 'Beverages',
    cost: 0.38,
    sale: 1.0,
    reorder: 48,
    daily: 10,
    lot: 144,
  },
  {
    sku: 'SNK-2001',
    name: 'Sea Salt Potato Chips 150g',
    category: 'Snacks',
    cost: 1.1,
    sale: 2.79,
    reorder: 15,
    daily: 3.5,
    lot: 48,
  },
  {
    sku: 'SNK-2002',
    name: 'Dark Chocolate Bar 85%',
    category: 'Snacks',
    cost: 1.25,
    sale: 3.2,
    reorder: 12,
    daily: 2,
    lot: 36,
  },
  {
    sku: 'SNK-2003',
    name: 'Trail Mix 200g',
    category: 'Snacks',
    cost: 2.1,
    sale: 4.99,
    reorder: 8,
    daily: 1.2,
    lot: 24,
    neglectedFor: 14,
  },
  {
    sku: 'SNK-2004',
    name: 'Salted Pretzels 250g',
    category: 'Snacks',
    cost: 0.95,
    sale: 2.29,
    reorder: 10,
    daily: 1.5,
    lot: 30,
  },
  {
    sku: 'SNK-2005',
    name: 'Granola Bar (6 pack)',
    category: 'Snacks',
    cost: 2.4,
    sale: 5.49,
    reorder: 10,
    daily: 1.8,
    lot: 30,
  },
  {
    sku: 'DRY-3001',
    name: 'Whole Milk 1L',
    category: 'Dairy & Eggs',
    cost: 0.85,
    sale: 1.89,
    reorder: 20,
    daily: 7,
    lot: 60,
  },
  {
    sku: 'DRY-3002',
    name: 'Free-Range Eggs (12)',
    category: 'Dairy & Eggs',
    cost: 2.6,
    sale: 4.99,
    reorder: 12,
    daily: 3,
    lot: 36,
    neglectedFor: 6,
  },
  {
    sku: 'DRY-3003',
    name: 'Greek Yogurt 500g',
    category: 'Dairy & Eggs',
    cost: 1.7,
    sale: 3.79,
    reorder: 10,
    daily: 2.2,
    lot: 30,
  },
  {
    sku: 'DRY-3004',
    name: 'Aged Cheddar 200g',
    category: 'Dairy & Eggs',
    cost: 2.9,
    sale: 5.99,
    reorder: 6,
    daily: 1,
    lot: 18,
  },
  {
    sku: 'DRY-3005',
    name: 'Salted Butter 250g',
    category: 'Dairy & Eggs',
    cost: 2.15,
    sale: 3.99,
    reorder: 8,
    daily: 1.4,
    lot: 24,
  },
  { sku: 'BAK-4001', name: 'Sourdough Loaf', category: 'Bakery', cost: 2.2, sale: 4.5, reorder: 6, daily: 4, lot: 20 },
  {
    sku: 'BAK-4002',
    name: 'Butter Croissant',
    category: 'Bakery',
    cost: 0.7,
    sale: 2.1,
    reorder: 10,
    daily: 6,
    lot: 30,
    neglectedFor: 4,
  },
  {
    sku: 'BAK-4003',
    name: 'Blueberry Muffin',
    category: 'Bakery',
    cost: 0.8,
    sale: 2.5,
    reorder: 8,
    daily: 3,
    lot: 24,
  },
  {
    sku: 'PAN-5001',
    name: 'Basmati Rice 1kg',
    category: 'Pantry',
    cost: 1.8,
    sale: 3.99,
    reorder: 10,
    daily: 1.2,
    lot: 30,
  },
  {
    sku: 'PAN-5002',
    name: 'Extra Virgin Olive Oil 500ml',
    category: 'Pantry',
    cost: 4.2,
    sale: 8.99,
    reorder: 6,
    daily: 0.7,
    lot: 18,
  },
  {
    sku: 'PAN-5003',
    name: 'Spaghetti 500g',
    category: 'Pantry',
    cost: 0.75,
    sale: 1.79,
    reorder: 15,
    daily: 2.5,
    lot: 48,
  },
  {
    sku: 'PAN-5004',
    name: 'Chopped Tomatoes 400g',
    category: 'Pantry',
    cost: 0.55,
    sale: 1.29,
    reorder: 18,
    daily: 2.8,
    lot: 48,
  },
  {
    sku: 'PAN-5005',
    name: 'Wildflower Honey 340g',
    category: 'Pantry',
    cost: 3.4,
    sale: 6.99,
    reorder: 5,
    daily: 0.5,
    lot: 12,
  },
  {
    sku: 'PAN-5006',
    name: 'Rolled Oats 1kg',
    category: 'Pantry',
    cost: 1.45,
    sale: 3.29,
    reorder: 8,
    daily: 0.9,
    lot: 24,
    neglectedFor: 20,
  },
  {
    sku: 'HSE-6001',
    name: 'Dish Soap 750ml',
    category: 'Household',
    cost: 1.3,
    sale: 2.99,
    reorder: 6,
    daily: 0.8,
    lot: 24,
  },
  {
    sku: 'HSE-6002',
    name: 'Paper Towels (2 rolls)',
    category: 'Household',
    cost: 1.6,
    sale: 3.49,
    reorder: 8,
    daily: 1.1,
    lot: 24,
  },
  {
    sku: 'HSE-6003',
    name: 'Trash Bags 30L (20)',
    category: 'Household',
    cost: 1.95,
    sale: 4.25,
    reorder: 5,
    daily: 0.6,
    lot: 18,
  },
  {
    sku: 'HSE-6004',
    name: 'AA Batteries (4 pack)',
    category: 'Household',
    cost: 2.5,
    sale: 5.99,
    reorder: 6,
    daily: 0.5,
    lot: 20,
  },
  {
    sku: 'PCR-7001',
    name: 'Toothpaste Fresh Mint 100ml',
    category: 'Personal Care',
    cost: 1.2,
    sale: 2.89,
    reorder: 6,
    daily: 0.7,
    lot: 24,
  },
  {
    sku: 'PCR-7002',
    name: 'Hand Soap Lavender 300ml',
    category: 'Personal Care',
    cost: 1.4,
    sale: 3.25,
    reorder: 6,
    daily: 0.6,
    lot: 18,
  },
  {
    sku: 'PCR-7003',
    name: 'SPF 50 Sunscreen 200ml',
    category: 'Personal Care',
    cost: 5.8,
    sale: 11.99,
    reorder: 4,
    daily: 0.3,
    lot: 12,
    neglectedFor: 25,
  },
  {
    sku: 'PCR-7004',
    name: 'Lip Balm Original',
    category: 'Personal Care',
    cost: 0.9,
    sale: 2.49,
    reorder: 6,
    daily: 0.6,
    lot: 24,
  },
];

const DAYS = 60;
const LEAD_TIME_DAYS = 2;
const toCents = (n: number) => Math.round(n * 100);

/** Mulberry32: tiny deterministic PRNG so the seed is reproducible. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJUSTMENT_NOTES = [
  { change: -1, note: 'Damaged packaging' },
  { change: -2, note: 'Expired - written off' },
  { change: 1, note: 'Stock count correction' },
  { change: -1, note: 'Customer return - unsellable' },
];
const SUPPLIERS = ['FreshWay Distributors', 'Northside Wholesale', 'Valley Farms Co-op', 'Metro Cash & Carry'];

function atTime(daysAgo: number, hour: number, minute: number) {
  // Offset by one day so even "today" in the simulation is safely in the past.
  const d = new Date();
  d.setDate(d.getDate() - daysAgo - 1);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('Clearing existing data...');
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  const categoryIds = new Map<string, number>();
  for (const c of categories) {
    const created = await prisma.category.create({ data: c });
    categoryIds.set(c.name, created.id);
  }

  const rand = rng(20240611);
  let movementCount = 0;

  for (const [index, p] of products.entries()) {
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        description: p.description ?? null,
        categoryId: categoryIds.get(p.category)!,
        costCents: toCents(p.cost),
        saleCents: toCents(p.sale),
        reorderLevel: p.reorder,
        quantity: 0,
      },
    });

    type Row = { type: string; change: number; quantityAfter: number; note: string | null; occurredAt: Date };
    const rows: Row[] = [];
    let qty = 0;
    const push = (type: string, change: number, note: string | null, occurredAt: Date) => {
      qty += change;
      rows.push({ type, change, quantityAfter: qty, note, occurredAt });
    };

    push('RECEIPT', p.lot + p.reorder, 'Opening stock', atTime(DAYS, 8, 0));
    let pendingDelivery: number | null = null;

    for (let day = DAYS - 1; day >= 0; day--) {
      // Morning deliveries
      if (pendingDelivery !== null && day <= pendingDelivery) {
        const supplier = SUPPLIERS[(index + day) % SUPPLIERS.length];
        push('RECEIPT', p.lot, `PO from ${supplier}`, atTime(day, 8, 15 + (index % 40)));
        pendingDelivery = null;
      }

      // Daily sales are recorded as one end-of-day entry per product.
      const demand = Math.round(p.daily * (0.5 + rand()));
      const sold = Math.min(demand, qty);
      if (sold > 0) push('SALE', -sold, 'Daily POS sales', atTime(day, 19, 30 + (index % 25)));

      // Occasional shrinkage / recount
      if (rand() < 0.025 && qty > 2) {
        const adj = ADJUSTMENT_NOTES[Math.floor(rand() * ADJUSTMENT_NOTES.length)];
        push('ADJUSTMENT', adj.change, adj.note, atTime(day, 12, 10 + (index % 45)));
      }

      // Reorder when we hit the reorder level, unless this item is being neglected.
      const neglected = p.neglectedFor !== undefined && day <= p.neglectedFor;
      if (!neglected && pendingDelivery === null && qty <= p.reorder) {
        pendingDelivery = day - LEAD_TIME_DAYS;
      }
    }

    await prisma.stockMovement.createMany({ data: rows.map((r) => ({ ...r, productId: product.id })) });
    await prisma.product.update({ where: { id: product.id }, data: { quantity: qty } });
    movementCount += rows.length;
  }

  const low = await prisma.product.count({
    where: { quantity: { lte: prisma.product.fields.reorderLevel } },
  });
  console.log(
    `Seeded ${categories.length} categories, ${products.length} products, ${movementCount} stock movements (${low} low on stock).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
