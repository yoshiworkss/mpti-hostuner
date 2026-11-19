import { Link } from 'react-router-dom'
import { useHostuner } from '../../context/useHostuner'
import type { BillingCycle, HostingProduct } from '../../types/hostuner'
import { FigmaIcon } from '../icons/FigmaIcon'

interface PlanCardProps {
  product: HostingProduct
  cycleOverride?: BillingCycle | 'default'
  variant?: 'grid' | 'wide'
}

/**
 * Reusable Store package card aligned with Figma Page FIX V6 (`05 Hosting IIX`,
 * `11 Paket Hosting Sekolah`, `13 Proxmox VPS Virtualizor`).
 */
export function PlanCard({ product, cycleOverride = 'default', variant = 'grid' }: PlanCardProps) {
  const { formatPrice } = useHostuner()

  const activeCycle: BillingCycle = cycleOverride === 'default' ? product.displayCycle : cycleOverride
  const activePriceIdr = activeCycle === 'annually' ? product.priceAnnual : product.priceMonthly
  const cycleSuffix = activeCycle === 'annually' ? '/Annually' : '/Monthly'
  const orderHref = `/order/domain?product=${encodeURIComponent(product.slug)}&cycle=${activeCycle}`

  if (variant === 'wide') {
    return (
      <article className="overflow-hidden rounded-[16px] border border-salmon-border bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-coral px-6 py-4">
          <h2 className="text-[18px] font-bold text-white">{product.name}</h2>
          <div className="flex items-center gap-2">
            {product.isFreeDomain && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white">
                Gratis Domain .sch.id
              </span>
            )}
            {product.stockLabel && (
              <span className="rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-coral">
                {product.stockLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 p-6 md:flex-row md:items-center">
          <ul className="space-y-2.5 text-[13px] font-medium text-teal">
            {product.specs.map((spec) => (
              <li key={spec} className="flex items-start gap-2.5">
                <span aria-hidden="true" className="font-bold text-teal">
                  ✓
                </span>
                <span>{spec}</span>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 flex-col items-start gap-3 md:items-center">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[24px] font-bold text-teal">{formatPrice(activePriceIdr)}</span>
              <span className="text-[12px] font-medium text-teal-muted">{cycleSuffix}</span>
            </div>
            <Link
              to={orderHref}
              className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-full bg-green-cta px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
            >
              <FigmaIcon name="cart" size={16} />
              <span>Order Now</span>
            </Link>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-[16px] border border-salmon-border bg-white shadow-soft transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex min-h-[60px] flex-col items-center justify-center gap-1.5 bg-coral px-5 py-3.5 text-center">
        <h2 className="text-[17px] font-bold leading-snug text-white">{product.name}</h2>
        {product.isFreeDomain && (
          <span className="rounded-full bg-white px-3 py-0.5 text-[11px] font-bold text-coral">
            Gratis Domain
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-baseline justify-center gap-1.5 pb-4 text-center">
          <span className="text-[22px] font-bold text-teal">{formatPrice(activePriceIdr)}</span>
          <span className="text-[12px] font-medium text-teal-muted">{cycleSuffix}</span>
        </div>

        <div className="mb-4 h-px w-full bg-border-soft" />

        <ul className="mb-6 flex-1 space-y-2.5 text-[13px] text-teal">
          {product.specs.map((spec) => (
            <li key={spec} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-cta text-[10px] font-bold text-white"
              >
                ✓
              </span>
              <span className="leading-snug">{spec}</span>
            </li>
          ))}
        </ul>

        <Link
          to={orderHref}
          className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-cta px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-cta-hover"
        >
          <FigmaIcon name="cart" size={16} />
          <span>Order Now</span>
        </Link>
      </div>
    </article>
  )
}

/**
 * Matches Figma Page FIX V6 Empty Category Notice (06–10 & 12 Proxmox VPS).
 */
export function EmptyProductGroupCard({ categoryName }: { categoryName: string }) {
  return (
    <div className="rounded-[20px] border border-salmon-border bg-white px-6 py-10 text-center shadow-soft md:px-10 md:py-12">
      <span className="inline-flex rounded-full bg-salmon-tint px-4 py-1 text-[10px] font-bold tracking-wider text-coral uppercase">
        Hostuner Product Group Notice
      </span>
      <h2 className="mt-4 text-[21px] font-bold text-teal">
        Product group does not contain any visible products
      </h2>
      <p className="mx-auto mt-2.5 max-w-[460px] text-[13px] leading-relaxed text-teal-muted">
        Saat ini kategori <strong className="text-teal">&quot;{categoryName}&quot;</strong> belum memiliki paket aktif
        yang ditampilkan. Silakan pilih kategori Hosting IIX, Paket Hosting Sekolah, atau Proxmox VPS Virtualizor pada
        sidebar di samping.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/store/hosting-iix"
          className="rounded-full bg-coral px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-coral-hover"
        >
          Explore Hosting IIX →
        </Link>
        <Link
          to="/store/proxmox-vps-virtualizor"
          className="rounded-full bg-mint px-6 py-2.5 text-[13px] font-semibold text-teal transition-colors hover:bg-mint-strip"
        >
          Explore Proxmox VPS Virtualizor
        </Link>
      </div>
    </div>
  )
}
