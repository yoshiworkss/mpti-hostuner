import announcementSvg from '../../assets/icons/announcement.svg'
import arrowDownSquareSvg from '../../assets/icons/arrow-in-down-square-half.svg'
import atSvg from '../../assets/icons/at.svg'
import bookOpenSvg from '../../assets/icons/book-open.svg'
import caretDownMutedSvg from '../../assets/icons/caret-down-muted.svg'
import caretDownWhiteSvg from '../../assets/icons/caret-down-white.svg'
import caretDownSvg from '../../assets/icons/caret-down.svg'
import caretLeftSvg from '../../assets/icons/caret-left.svg'
import caretRightSvg from '../../assets/icons/caret-right.svg'
import caretUpSvg from '../../assets/icons/caret-up.svg'
import cartTealSvg from '../../assets/icons/cart-teal.svg'
import cartSvg from '../../assets/icons/cart.svg'
import creditCardAltSvg from '../../assets/icons/credit-card-alt.svg'
import creditCardWhiteSvg from '../../assets/icons/credit-card-white.svg'
import dashboardSvg from '../../assets/icons/dashboard.svg'
import desktopWhiteSvg from '../../assets/icons/desktop-white.svg'
import desktopSvg from '../../assets/icons/desktop.svg'
import envelopeAltSvg from '../../assets/icons/envelope-alt.svg'
import envelopeWhiteSvg from '../../assets/icons/envelope-white.svg'
import fileDetailSvg from '../../assets/icons/file-detail.svg'
import folderOpenSvg from '../../assets/icons/folder-open.svg'
import globeAlt2Svg from '../../assets/icons/globe-alt-2.svg'
import globeTealSvg from '../../assets/icons/globe-teal.svg'
import globeWhiteSvg from '../../assets/icons/globe-white.svg'
import lockKeyholeSvg from '../../assets/icons/lock-keyhole.svg'
import phoneSvg from '../../assets/icons/phone.svg'
import satelliteDishSvg from '../../assets/icons/satellite-dish-alt.svg'
import searchSvg from '../../assets/icons/search.svg'
import spannerSvg from '../../assets/icons/spanner.svg'
import starFilledSvg from '../../assets/icons/star-filled.svg'
import ticketSvg from '../../assets/icons/ticket.svg'
import ticketsSvg from '../../assets/icons/tickets.svg'
import userFilledSvg from '../../assets/icons/user-filled.svg'

export type FigmaIconName =
  | 'announcement'
  | 'arrow-down-square'
  | 'at'
  | 'book-open'
  | 'caret-down'
  | 'caret-down-muted'
  | 'caret-down-white'
  | 'caret-left'
  | 'caret-right'
  | 'caret-up'
  | 'cart'
  | 'cart-teal'
  | 'credit-card'
  | 'credit-card-white'
  | 'dashboard'
  | 'desktop'
  | 'desktop-white'
  | 'envelope'
  | 'envelope-white'
  | 'file-detail'
  | 'folder-open'
  | 'globe'
  | 'globe-teal'
  | 'globe-white'
  | 'lock'
  | 'phone'
  | 'satellite-dish'
  | 'search'
  | 'spanner'
  | 'star-filled'
  | 'ticket'
  | 'tickets'
  | 'user-filled'

const ICON_MAP: Record<FigmaIconName, string> = {
  announcement: announcementSvg,
  'arrow-down-square': arrowDownSquareSvg,
  at: atSvg,
  'book-open': bookOpenSvg,
  'caret-down': caretDownSvg,
  'caret-down-muted': caretDownMutedSvg,
  'caret-down-white': caretDownWhiteSvg,
  'caret-left': caretLeftSvg,
  'caret-right': caretRightSvg,
  'caret-up': caretUpSvg,
  cart: cartSvg,
  'cart-teal': cartTealSvg,
  'credit-card': creditCardAltSvg,
  'credit-card-white': creditCardWhiteSvg,
  dashboard: dashboardSvg,
  desktop: desktopSvg,
  'desktop-white': desktopWhiteSvg,
  envelope: envelopeAltSvg,
  'envelope-white': envelopeWhiteSvg,
  'file-detail': fileDetailSvg,
  'folder-open': folderOpenSvg,
  globe: globeAlt2Svg,
  'globe-teal': globeTealSvg,
  'globe-white': globeWhiteSvg,
  lock: lockKeyholeSvg,
  phone: phoneSvg,
  'satellite-dish': satelliteDishSvg,
  search: searchSvg,
  spanner: spannerSvg,
  'star-filled': starFilledSvg,
  ticket: ticketSvg,
  tickets: ticketsSvg,
  'user-filled': userFilledSvg,
}

interface FigmaIconProps {
  name: FigmaIconName
  size?: number
  className?: string
  alt?: string
}

export function FigmaIcon({ name, size = 16, className = '', alt = '' }: FigmaIconProps) {
  const src = ICON_MAP[name]
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt === ''}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}
