import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FigmaIcon } from '../icons/FigmaIcon'
import { useHostuner } from '../../context/useHostuner'

export interface BreadcrumbSegment {
  label: string
  to?: string
}

interface BreadcrumbBackBarProps {
  backTo?: string
  backLabel?: string
  segments: BreadcrumbSegment[]
}

/**
 * Matches Figma V6 Interactive Breadcrumb & Back Path pill bar.
 */
export function BreadcrumbBackBar({ backTo, backLabel = '← Back', segments }: BreadcrumbBackBarProps) {
  const navigate = useNavigate()

  return (
    <nav
      aria-label="Breadcrumb"
      className="inline-flex flex-wrap items-center gap-[10px] rounded-full border border-salmon-border bg-white px-[14px] py-[8px]"
    >
      {backTo && (
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-[6px] rounded-full border border-salmon bg-salmon-tint px-[12px] py-[5px] text-[12px] font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
        >
          {backLabel}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-[8px] text-[12px]">
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1
          return (
            <span key={`${seg.label}-${idx}`} className="inline-flex items-center gap-[8px]">
              {seg.to && !isLast ? (
                <Link
                  to={seg.to}
                  className="px-[4px] py-[2px] font-medium text-teal transition-colors hover:text-coral hover:underline"
                >
                  {seg.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={`px-[4px] py-[2px] ${isLast ? 'font-bold text-coral' : 'font-medium text-teal'}`}
                >
                  {seg.label}
                </span>
              )}
              {!isLast && <span className="font-bold text-teal-muted">›</span>}
            </span>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * Matches 05_SRS NFR-02: Loading Skeleton state on cards, tables, and lists.
 */
export function LoadingSkeleton({
  variant = 'cards',
  count = 4,
}: {
  variant?: 'cards' | 'list' | 'table'
  count?: number
}) {
  if (variant === 'table') {
    return (
      <div
        role="status"
        aria-label="Memuat data tabel"
        className="space-y-3 rounded-[16px] border border-border-soft bg-white p-6 shadow-soft"
      >
        <div className="h-5 w-48 animate-pulse rounded-[8px] bg-input-bg" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-11 w-full animate-pulse rounded-[10px] bg-blush" />
        ))}
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div role="status" aria-label="Memuat daftar" className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-[14px] border border-border-soft bg-white p-4 shadow-soft"
          >
            <div className="space-y-2">
              <div className="h-4 w-56 animate-pulse rounded bg-input-bg" />
              <div className="h-3 w-80 max-w-full animate-pulse rounded bg-blush" />
            </div>
            <div className="h-9 w-28 animate-pulse rounded-full bg-input-bg" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div role="status" aria-label="Memuat katalog" className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[16px] border border-border-soft bg-white shadow-soft"
        >
          <div className="h-[58px] animate-pulse bg-salmon/35" />
          <div className="space-y-3 p-6">
            <div className="mx-auto h-7 w-40 animate-pulse rounded bg-input-bg" />
            <div className="h-px w-full bg-border-soft" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-blush" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-blush" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-blush" />
            </div>
            <div className="h-10 w-full animate-pulse rounded-full bg-green-soft" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Matches 05_SRS NFR-02: Inline Validation Error Message.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-coral">
      <span aria-hidden="true">!</span>
      <span>{message}</span>
    </p>
  )
}

/**
 * Matches 05_SRS NFR-02: Accessible Feedback Modal Pop-up.
 */
interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'coral' | 'teal' | 'green'
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'coral',
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  if (!open) return null

  const confirmClass =
    tone === 'green'
      ? 'bg-green-cta hover:bg-green-cta-hover text-white'
      : tone === 'teal'
        ? 'bg-teal hover:opacity-90 text-white'
        : 'bg-coral hover:bg-coral-hover text-white'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hostuner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/45 p-4"
    >
      <div className="w-full max-w-[440px] rounded-[20px] border border-salmon-border bg-white p-6 shadow-soft">
        <h2 id="hostuner-modal-title" className="text-[18px] font-bold text-teal">
          {title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-teal-muted">{description}</p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border-soft bg-blush px-5 py-2 text-[13px] font-semibold text-teal transition-colors hover:bg-input-bg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ToastStack() {
  const { toasts, dismissToast } = useHostuner()
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 flex max-w-[360px] flex-col gap-2"
    >
      {toasts.map((t) => {
        const badgeStyle =
          t.type === 'error'
            ? 'border-coral bg-salmon-tint text-coral'
            : t.type === 'info'
              ? 'border-teal/30 bg-mint-strip text-teal'
              : 'border-green-cta bg-green-soft text-charcoal'
        return (
          <div
            key={t.id}
            className={`flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3 text-[13px] font-medium shadow-soft ${badgeStyle}`}
          >
            <div className="flex items-center gap-2">
              <FigmaIcon name="announcement" size={16} />
              <span>{t.text}</span>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Tutup notifikasi"
              className="rounded-full px-2 py-0.5 text-[12px] font-bold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
