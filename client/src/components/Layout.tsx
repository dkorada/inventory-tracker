import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Boxes, LayoutDashboard, Menu, Package, Plus, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
import { useDashboard } from '../hooks/queries';
import { useInventoryActions } from './InventoryActions';
import { Button } from './ui/Button';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/movements', label: 'Stock movements', icon: ArrowLeftRight },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="from-brand-500 to-brand-700 shadow-brand-600/30 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm">
        <Boxes className="size-5 text-white" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-white">StockPilot</div>
        <div className="text-[11px] text-slate-400">Maple Street Market</div>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useDashboard();
  const low = data?.totals.lowStockCount ?? 0;
  return (
    <nav className="flex flex-col gap-1">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
            )
          }
        >
          <Icon className="size-[18px] shrink-0" />
          <span className="flex-1">{label}</span>
          {to === '/products' && low > 0 && (
            <span
              className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
              title={`${low} products low on stock`}
            >
              {low}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Shown on the hosted demo, where the database is a disposable copy. */
function DemoBanner() {
  const { data } = useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: Infinity });
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('demo-banner') === 'hidden';
    } catch {
      return false;
    }
  });
  if (!data?.demo || hidden) return null;
  return (
    <div className="bg-brand-50 text-brand-700 ring-brand-100 mb-6 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1">
      <Sparkles className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">
        <span className="font-semibold">Live demo.</span> Feel free to add, edit and delete products. Sample data is
        restored automatically, so your changes are temporary.
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem('demo-banner', 'hidden');
          } catch {
            /* storage unavailable */
          }
        }}
        className="hover:bg-brand-100 rounded p-0.5"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openCreate } = useInventoryActions();
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 px-4 py-5 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <div className="mt-8 flex-1">
          <NavItems />
        </div>
        <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="text-xs font-medium text-white">Receive a delivery?</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Record receipts and sales from any product row.</p>
          <Button size="sm" className="mt-3 w-full" onClick={openCreate}>
            <Plus className="size-4" /> New product
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-slate-900 px-4 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <div className="animate-pop-in absolute inset-y-0 left-0 flex w-72 flex-col bg-slate-900 px-4 py-4">
            <div className="flex items-center justify-between px-2">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-8">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <DemoBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
