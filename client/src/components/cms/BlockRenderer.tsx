'use client';

import { useState } from 'react';
import type { CmsBlock } from '@/types/api';

function FaqItem({ title, body, bodyUrdu }: { title: string; body: string; bodyUrdu?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-gray-900"
        aria-expanded={open}
      >
        {title}
        <span className="text-gray-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-6 text-gray-700">
          <p>{body}</p>
          {bodyUrdu && <p dir="rtl" className="mt-2 text-gray-500">{bodyUrdu}</p>}
        </div>
      )}
    </div>
  );
}

export function BlockRenderer({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2 key={i} className="mt-8 text-xl font-bold text-gray-900 sm:text-2xl">{block.title}</h2>
            );
          case 'paragraph':
            return (
              <div key={i}>
                <p className="text-sm leading-7 text-gray-700">{block.body}</p>
                {block.bodyUrdu && <p dir="rtl" className="mt-2 text-gray-500">{block.bodyUrdu}</p>}
              </div>
            );
          case 'steps':
            return (
              <ol key={i} className="space-y-3">
                {(block.items ?? []).map((item, idx) => (
                  <li key={idx} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      {item.body && <p className="mt-0.5 text-sm text-gray-600">{item.body}</p>}
                      {item.bodyUrdu && <p dir="rtl" className="mt-1 text-sm text-gray-500">{item.bodyUrdu}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            );
          case 'faq':
            return (
              <div key={i} className="space-y-3">
                {(block.items ?? []).map((item, idx) => (
                  <FaqItem key={idx} title={item.title} body={item.body} bodyUrdu={item.bodyUrdu} />
                ))}
              </div>
            );
          case 'stats':
            return (
              <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(block.items ?? []).map((item, idx) => (
                  <div key={idx} className="rounded-xl bg-brand-50 p-4 text-center">
                    <p className="text-2xl font-extrabold text-brand-800">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{item.body}</p>
                  </div>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
