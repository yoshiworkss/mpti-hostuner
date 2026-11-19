import { createContext, useContext } from 'react'
import type { ApiResponse, CartItem, InvoiceRecord } from '../types/hostuner'
import type { PendingAuthItem } from '../services/hostunerRevisionStore'

export interface RevisionCartContextValue {
  reviewItems: CartItem[]
  reviewSource: 'draft' | 'cart'
  pendingAuthItem: PendingAuthItem | null
  startReviewFromCartSelection: (selectedIds: string[]) => void
  moveReviewDraftToCart: () => void
  createOrderForReviewItems: () => ApiResponse<InvoiceRecord>
  clearPendingAuthItem: () => void
}

export const RevisionCartContext = createContext<RevisionCartContextValue | null>(null)

export function useRevisionCart(): RevisionCartContextValue {
  const ctx = useContext(RevisionCartContext)
  if (!ctx) {
    throw new Error('useRevisionCart must be used inside HostunerRevisionProvider')
  }
  return ctx
}
