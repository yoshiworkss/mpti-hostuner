import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useHostuner } from '../../context/useHostuner'
import { FigmaIcon } from '../icons/FigmaIcon'

interface TopUtilityBarProps {
  mode?: 'public' | 'admin'
}

export function TopUtilityBar({ mode = 'public' }: TopUtilityBarProps) {
  const { currentUser, role, language, setLanguage, state, logoutUser } = useHostuner()
  const [langOpen, setLangOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isLoginPath = location.pathname === '/login'
  const isRegisterPath = location.pathname === '/register'
  const isCartPath = location.pathname === '/cart'

  if (mode === 'admin' && role === 'admin') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/admin" className="flex items-center gap-[12px]">
          <span className="flex items-center justify-center rounded-full bg-coral px-[12px] py-[8px] text-[20px] font-bold leading-none text-white">
            H
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[21px] font-bold text-coral">Hostuner.Com — Admin Portal</span>
            <span className="text-[11px] font-normal text-teal">
              Back-Office Management: Logs, CRUD &amp; Payment Settings
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-strip px-[14px] py-[6px] text-[12px] font-semibold text-teal">
            <FigmaIcon name="user-filled" size={14} />
            Halo, {currentUser?.name ?? 'Admin Hostuner'} (Superadmin Aktif)
          </span>
          <Link
            to="/client"
            className="rounded-full bg-salmon-tint px-[12px] py-[6px] text-[12px] font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
          >
            Switch to Client Area →
          </Link>
          <button
            type="button"
            onClick={() => {
              logoutUser()
              navigate('/')
            }}
            className="rounded-full bg-white px-[12px] py-[6px] text-[12px] font-semibold text-coral shadow-xs transition-colors hover:bg-salmon-tint"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-[12px]">
        <span className="flex items-center justify-center rounded-full bg-coral px-[12px] py-[8px] text-[20px] font-bold leading-none text-white">
          H
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[22px] font-bold text-coral">Hostuner.Com</span>
          <span className="text-[11px] font-normal text-teal">Web Hosting, VPS and Domain</span>
        </span>
      </Link>

      <div className="flex flex-wrap items-center gap-[10px] sm:gap-[12px]">
        {/* Language Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            aria-expanded={langOpen}
            aria-label="Pilih bahasa"
            className="inline-flex items-center gap-[6px] rounded-full bg-white px-[12px] py-[5px] text-[12px] font-semibold text-teal shadow-xs transition-colors hover:bg-mint-strip"
          >
            <FigmaIcon name="globe-teal" size={15} />
            <span>{language} ▾</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 z-40 mt-2 w-40 rounded-[14px] border border-salmon-border bg-white p-1.5 shadow-soft">
              {(['English', 'Indonesia'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setLanguage(lang)
                    setLangOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-[10px] px-3 py-1.5 text-left text-[12px] font-medium ${
                    language === lang ? 'bg-salmon-tint font-semibold text-coral' : 'text-teal hover:bg-blush'
                  }`}
                >
                  <span>{lang}</span>
                  {language === lang && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Shortcut Badge */}
        <Link
          to="/cart"
          className={`inline-flex items-center gap-[6px] rounded-full px-[12px] py-[5px] text-[12px] font-semibold shadow-xs transition-colors ${
            isCartPath ? 'bg-coral text-white' : 'bg-white text-teal hover:bg-salmon-tint hover:text-coral'
          }`}
        >
          <FigmaIcon name="cart-teal" size={15} />
          <span>View Cart ({state.cart.length})</span>
        </Link>

        {/* Role-aware Auth Status */}
        {role === 'guest' && (
          <div className="flex items-center gap-[10px]">
            <Link
              to="/login"
              className={
                isLoginPath
                  ? 'rounded-full bg-salmon-tint px-[12px] py-[5px] text-[13px] font-semibold text-coral'
                  : 'text-[14px] font-medium text-teal hover:text-coral'
              }
            >
              Login
            </Link>
            <span className="text-[14px] text-teal-muted">|</span>
            <Link
              to="/register"
              className={
                isRegisterPath
                  ? 'rounded-full bg-salmon-tint px-[12px] py-[5px] text-[13px] font-semibold text-coral'
                  : 'text-[14px] font-medium text-teal hover:text-coral'
              }
            >
              Register
            </Link>
          </div>
        )}

        {role === 'customer' && currentUser && (
          <div className="flex flex-wrap items-center gap-[10px]">
            <Link
              to="/client"
              className="rounded-full bg-mint-strip px-[14px] py-[6px] text-[12px] font-semibold text-teal transition-colors hover:bg-mint sm:text-[13px]"
            >
              Selamat Datang, {currentUser.name} (Akun Aktif)
            </Link>
            <span className="hidden text-[14px] text-teal sm:inline">|</span>
            <button
              type="button"
              onClick={() => {
                logoutUser()
                navigate('/')
              }}
              className="text-[13px] font-semibold text-coral hover:underline"
            >
              Logout
            </button>
          </div>
        )}

        {role === 'admin' && currentUser && (
          <div className="flex flex-wrap items-center gap-[10px]">
            <Link
              to="/admin"
              className="rounded-full bg-salmon-tint px-[14px] py-[6px] text-[12px] font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
            >
              🛡️ Admin Portal ({currentUser.name})
            </Link>
            <button
              type="button"
              onClick={() => {
                logoutUser()
                navigate('/')
              }}
              className="text-[13px] font-semibold text-coral hover:underline"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
