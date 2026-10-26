import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useCategories, useSaveProduct } from '../hooks/queries';
import { ApiError } from '../lib/api';
import { formatMoney, margin } from '../lib/format';
import type { Product, ProductInput } from '../lib/types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Field, Input, Select, Textarea } from './ui/Field';

interface Props {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
}

type FormState = Record<
  'sku' | 'name' | 'description' | 'categoryId' | 'costPrice' | 'salePrice' | 'quantity' | 'reorderLevel' | 'note',
  string
>;

const empty: FormState = {
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  costPrice: '',
  salePrice: '',
  quantity: '0',
  reorderLevel: '5',
  note: '',
};

const fromProduct = (p: Product): FormState => ({
  sku: p.sku,
  name: p.name,
  description: p.description ?? '',
  categoryId: String(p.categoryId),
  costPrice: p.costPrice.toFixed(2),
  salePrice: p.salePrice.toFixed(2),
  quantity: String(p.quantity),
  reorderLevel: String(p.reorderLevel),
  note: '',
});

/** Client-side checks mirror the API so users get instant feedback; the API remains the source of truth. */
function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.sku.trim().length < 2) e.sku = 'SKU must be at least 2 characters';
  else if (!/^[A-Za-z0-9][A-Za-z0-9-_]*$/.test(f.sku.trim())) e.sku = 'Use letters, numbers, dashes or underscores';
  if (!f.name.trim()) e.name = 'Name is required';
  if (!f.categoryId) e.categoryId = 'Choose a category';
  for (const k of ['costPrice', 'salePrice'] as const) {
    if (f[k] === '' || Number.isNaN(Number(f[k]))) e[k] = 'Enter a price';
    else if (Number(f[k]) < 0) e[k] = 'Cannot be negative';
  }
  for (const k of ['quantity', 'reorderLevel'] as const) {
    const n = Number(f[k]);
    if (f[k] === '' || !Number.isInteger(n)) e[k] = 'Enter a whole number';
    else if (n < 0) e[k] = 'Cannot be negative';
  }
  return e;
}

export function ProductFormModal({ open, product, onClose }: Props) {
  const isEdit = !!product;
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: categories } = useCategories();
  const save = useSaveProduct();

  useEffect(() => {
    if (open) {
      setForm(product ? fromProduct(product) : empty);
      setErrors({});
    }
  }, [open, product]);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
  };

  const qtyChanged = isEdit && form.quantity !== String(product!.quantity);
  const cost = Number(form.costPrice);
  const sale = Number(form.salePrice);
  const showMargin = form.costPrice !== '' && form.salePrice !== '' && sale > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    const input: ProductInput = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      categoryId: Number(form.categoryId),
      costPrice: Number(form.costPrice),
      salePrice: Number(form.salePrice),
      quantity: Number(form.quantity),
      reorderLevel: Number(form.reorderLevel),
      ...(qtyChanged && form.note.trim() ? { note: form.note.trim() } : {}),
    };

    try {
      const saved = await save.mutateAsync({ id: product?.id, input });
      toast.success(isEdit ? 'Product updated' : 'Product added', { description: `${saved.name} (${saved.sku})` });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields.length) setErrors(err.fieldMap());
      toast.error(err instanceof Error ? err.message : 'Could not save product');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit product' : 'Add product'}
      description={isEdit ? `Update details for ${product!.sku}` : 'Add a new item to your catalogue.'}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Field label="SKU" error={errors.sku} hint="Unique code, e.g. BEV-1001" className="sm:col-span-2">
          {(a) => (
            <Input
              id={a.id}
              invalid={a.invalid}
              aria-describedby={a.describedBy}
              value={form.sku}
              onChange={set('sku')}
              className="font-mono uppercase"
              autoComplete="off"
              maxLength={32}
            />
          )}
        </Field>
        <Field label="Product name" error={errors.name} className="sm:col-span-4">
          {(a) => (
            <Input
              id={a.id}
              invalid={a.invalid}
              aria-describedby={a.describedBy}
              value={form.name}
              onChange={set('name')}
              maxLength={120}
            />
          )}
        </Field>
        <Field label="Category" error={errors.categoryId} className="sm:col-span-3">
          {(a) => (
            <Select
              id={a.id}
              invalid={a.invalid}
              aria-describedby={a.describedBy}
              value={form.categoryId}
              onChange={set('categoryId')}
            >
              <option value="">Select a category…</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="hidden sm:col-span-3 sm:block" />
        <Field label="Cost price" error={errors.costPrice} className="sm:col-span-2">
          {(a) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                $
              </span>
              <Input
                id={a.id}
                invalid={a.invalid}
                aria-describedby={a.describedBy}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.costPrice}
                onChange={set('costPrice')}
                className="tabular pl-7"
              />
            </div>
          )}
        </Field>
        <Field
          label="Sale price"
          error={errors.salePrice}
          hint={
            showMargin ? `Margin ${margin(cost, sale).toFixed(1)}% · ${formatMoney(sale - cost)} per unit` : undefined
          }
          className="sm:col-span-2"
        >
          {(a) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                $
              </span>
              <Input
                id={a.id}
                invalid={a.invalid}
                aria-describedby={a.describedBy}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.salePrice}
                onChange={set('salePrice')}
                className="tabular pl-7"
              />
            </div>
          )}
        </Field>
        <div className="hidden sm:col-span-2 sm:block" />
        <Field
          label={isEdit ? 'Quantity on hand' : 'Opening quantity'}
          error={errors.quantity}
          hint={isEdit ? 'Changes are logged as an adjustment' : 'Recorded as an opening receipt'}
          className="sm:col-span-3"
        >
          {(a) => (
            <Input
              id={a.id}
              invalid={a.invalid}
              aria-describedby={a.describedBy}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={form.quantity}
              onChange={set('quantity')}
              className="tabular"
            />
          )}
        </Field>
        <Field
          label="Reorder level"
          error={errors.reorderLevel}
          hint="Alert when stock falls to this level"
          className="sm:col-span-3"
        >
          {(a) => (
            <Input
              id={a.id}
              invalid={a.invalid}
              aria-describedby={a.describedBy}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={form.reorderLevel}
              onChange={set('reorderLevel')}
              className="tabular"
            />
          )}
        </Field>
        {qtyChanged && (
          <Field label="Reason for quantity change" className="sm:col-span-6">
            {(a) => (
              <Input
                id={a.id}
                value={form.note}
                onChange={set('note')}
                placeholder="e.g. Shelf recount"
                maxLength={200}
              />
            )}
          </Field>
        )}
        <Field label="Description (optional)" className="sm:col-span-6">
          {(a) => (
            <Textarea id={a.id} rows={2} value={form.description} onChange={set('description')} maxLength={500} />
          )}
        </Field>
      </form>
    </Modal>
  );
}
