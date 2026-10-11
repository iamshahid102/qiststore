'use client';

import { useState } from 'react';
import { LuCheck } from 'react-icons/lu';
import { formatRs } from '@/lib/format';
import { useCart } from '@/stores/cart';
import type { PlanOption } from '@/types/api';

export function PlanSelector({
  slug,
  productName,
  cashPrice,
  plans,
}: {
  slug: string;
  productName: string;
  cashPrice: number;
  plans: PlanOption[];
}) {
  const [selectedTerm, setSelectedTerm] = useState<number>(plans[0]?.term ?? 0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);

  const plan = plans.find((p) => p.term === selectedTerm);
  if (!plan) return null;

  const totalPayable = plan.advance + plan.monthly * plan.term;

  function onAdd() {
    add({
      slug,
      name: productName,
      qty,
      term: plan!.term,
      cashPrice,
      advance: plan!.advance,
      monthly: plan!.monthly,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="rounded-xl border border-cream-200 bg-white p-3 sm:p-4">
      <h2 className="mb-3 text-sm font-bold text-gray-900 sm:text-base">Select Your Installment Plan</h2>

      <div className="space-y-2">
        {plans.map((p, i) => {
          const active = p.term === selectedTerm;
          return (
            <button
              key={p.term}
              type="button"
              onClick={() => setSelectedTerm(p.term)}
              className={`flex w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3 ${
                active ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-gray-200 hover:border-brand-300'
              }`}
              aria-pressed={active}
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Plan {i + 1}</span>
                <span className="text-sm font-bold text-gray-900 sm:text-base">
                  {formatRs(p.monthly)} <span className="font-normal text-gray-500">× {p.term} months</span>
                </span>
              </span>
              <span className="sm:text-right">
                <span className="text-[11px] text-gray-500 sm:block">Advance</span>{' '}
                <span className="text-sm font-bold text-brand-700 sm:text-base">{formatRs(p.advance)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-cream-100 px-3 py-2.5 text-sm sm:px-4">
        <span className="text-gray-600">Total payable</span>
        <span className="font-bold text-gray-900">{formatRs(totalPayable)}</span>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full items-center justify-between rounded-lg border border-gray-300 sm:w-auto sm:justify-start">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2.5 text-lg" aria-label="Decrease quantity">−</button>
          <span className="w-10 text-center font-semibold">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} className="px-4 py-2.5 text-lg" aria-label="Increase quantity">+</button>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-lg bg-accent-500 py-3 text-sm font-bold text-white transition hover:bg-accent-600 sm:flex-1 sm:text-base"
        >
          {added ? (
            <>
              <LuCheck className="h-4 w-4" aria-hidden /> Added to Cart
            </>
          ) : (
            'Add to Cart'
          )}
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-gray-400 sm:text-xs">
        Free delivery · No documentation charges · Early repayment allowed
      </p>
    </div>
  );
}
