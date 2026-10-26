import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useRecordMovement } from '../hooks/queries';
import { ApiError } from '../lib/api';
import { formatNumber } from '../lib/format';
import type { MovementType, Product } from '../lib/types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Field, Input } from './ui/Field';

interface Props {
  open: boolean;
  product: Product | null;
  initialType?: MovementType;
  onClose: () => void;
}

const types: Array<{ value: MovementType; label: string; help: string }> = [
  { value: 'RECEIPT', label: 'Receipt', help: 'Stock delivered by a supplier' },
  { value: 'SALE', label: 'Sale', help: 'Units sold to customers' },
  { value: 'ADJUSTMENT', label: 'Adjustment', help: 'Damage, expiry or recount' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function MovementModal({ open, product, initialType = 'RECEIPT', onClose }: Props) {
  const [type, setType] = useState<MovementType>(initialType);
  const [direction, setDirection] = useState<'add' | 'remove'>('remove');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string>();
  const record = useRecordMovement();

  useEffect(() => {
    if (open) {
      setType(initialType);
      setDirection('remove');
      setQuantity('');
      setNote('');
      setDate(today());
      setError(undefined);
    }
  }, [open, initialType]);

  if (!product) return null;

  const n = Number(quantity);
  const valid = quantity !== '' && Number.isInteger(n) && n > 0;
  const change = !valid ? 0 : type === 'RECEIPT' || (type === 'ADJUSTMENT' && direction === 'add') ? n : -n;
  const after = product.quantity + change;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return setError('Enter a whole number greater than zero');
    if (after < 0) return setError(`Only ${product!.quantity} in stock`);

    // Keep the time of day for "today", otherwise record at midday on the chosen date.
    const occurredAt = date === today() ? new Date() : new Date(`${date}T12:00:00`);
    try {
      await record.mutateAsync({
        productId: product!.id,
        input: {
          type,
          quantity: type === 'ADJUSTMENT' ? change : n,
          note: note.trim() || undefined,
          occurredAt: occurredAt.toISOString(),
        },
      });
      toast.success('Stock updated', {
        description: `${product!.name}: ${formatNumber(product!.quantity)} → ${formatNumber(after)}`,
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields[0]) setError(err.fields[0].message);
      toast.error(err instanceof Error ? err.message : 'Could not record movement');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record stock movement"
      description={
        <>
          {product.name} · <span className="font-mono">{product.sku}</span>
        </>
      }
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="movement-form" loading={record.isPending}>
            Record {types.find((t) => t.value === type)!.label.toLowerCase()}
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={onSubmit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Type</legend>
          <div className="grid grid-cols-3 gap-2">
            {types.map((t) => (
              <label
                key={t.value}
                className={clsx(
                  'cursor-pointer rounded-lg px-3 py-2.5 text-center ring-1 transition-colors',
                  type === t.value ? 'bg-brand-50 ring-brand-500 ring-2' : 'ring-slate-200 hover:bg-slate-50',
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium text-slate-900">{t.label}</span>
                <span className="mt-0.5 hidden text-[11px] leading-4 text-slate-500 sm:block">{t.help}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {type === 'ADJUSTMENT' && (
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
            {(['remove', 'add'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={clsx(
                  'rounded-md px-3 py-1 font-medium',
                  direction === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                )}
              >
                {d === 'remove' ? 'Remove units' : 'Add units'}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Units" error={error}>
            {(a) => (
              <Input
                id={a.id}
                invalid={a.invalid}
                aria-describedby={a.describedBy}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError(undefined);
                }}
                className="tabular"
              />
            )}
          </Field>
          <Field label="Date">
            {(a) => (
              <Input id={a.id} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            )}
          </Field>
        </div>

        <Field label="Note (optional)">
          {(a) => (
            <Input
              id={a.id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder={
                type === 'RECEIPT'
                  ? 'e.g. PO #1042 from FreshWay'
                  : type === 'SALE'
                    ? 'e.g. Daily POS sales'
                    : 'e.g. Damaged packaging'
              }
            />
          )}
        </Field>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200/70">
          <span className="text-slate-500">Stock after this movement</span>
          <span className="tabular font-semibold">
            <span className="text-slate-400">{formatNumber(product.quantity)} → </span>
            <span
              className={clsx(
                after < 0 ? 'text-rose-600' : after <= product.reorderLevel ? 'text-amber-600' : 'text-slate-900',
              )}
            >
              {formatNumber(after)}
            </span>
          </span>
        </div>
      </form>
    </Modal>
  );
}
