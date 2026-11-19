import type { ReactNode } from 'react'
import { AdminCapsuleNavbar, CapsuleNavbar } from './CapsuleNavbar'
import { AdminSidebar } from './HybridSidebar'
import { Footer } from './Footer'
import { TopUtilityBar } from './TopUtilityBar'

interface PageShellProps {
  children: ReactNode
  sidebar?: ReactNode
  fullWidthContent?: boolean
  mode?: 'public' | 'admin'
}

export function PageShell({
  children,
  sidebar,
  fullWidthContent = false,
  mode = 'public',
}: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-blush">
      <header className="w-full py-[24px] md:py-[28px]">
        <div className="mx-auto flex max-w-[1064px] flex-col gap-[18px] px-4 xl:px-0">
          <TopUtilityBar mode={mode} />
          {mode === 'admin' ? <AdminCapsuleNavbar /> : <CapsuleNavbar />}
        </div>
      </header>

      <main className="flex-1">
        {fullWidthContent ? (
          children
        ) : (
          <div className="mx-auto max-w-[1064px] px-4 pb-12 xl:px-0">
            {mode === 'admin' ? (
              <div className="flex flex-col items-start gap-[24px] md:flex-row lg:gap-[32px]">
                <AdminSidebar />
                <div className="min-w-0 flex-1 space-y-6">{children}</div>
              </div>
            ) : sidebar ? (
              <div className="flex flex-col items-start gap-[24px] md:flex-row lg:gap-[32px]">
                {sidebar}
                <div className="min-w-0 flex-1 space-y-6">{children}</div>
              </div>
            ) : (
              children
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
