import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-auto w-full bg-teal py-[32px] text-white">
      <div className="mx-auto flex max-w-[1064px] flex-col gap-[20px] px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-[6px]">
            <p className="text-[18px] font-bold text-white">Hostuner.Com</p>
            <p className="max-w-[300px] text-[12px] leading-relaxed text-mint">
              Layanan Web Hosting IIX, Proxmox VPS, Paket Sekolah &amp; Domain Indonesia.
            </p>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[13px] font-bold text-white">Layanan Store (9 Kategori)</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-mint-strip">
              <Link to="/store/hosting-iix" className="hover:underline">Hosting IIX</Link>
              <Link to="/store/proxmox-vps-virtualizor" className="hover:underline">Proxmox VPS Virtualizor</Link>
              <Link to="/store/paket-hosting-sekolah" className="hover:underline">Paket Sekolah</Link>
              <Link to="/domain/register" className="hover:underline">Register a New Domain</Link>
              <Link to="/domain/transfer" className="hover:underline">Transfer Domain to Us</Link>
              <Link to="/cart" className="hover:underline">View Cart</Link>
            </div>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[13px] font-bold text-white">Support &amp; Client Portal</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-mint-strip">
              <Link to="/tickets" className="hover:underline">My Support Tickets</Link>
              <Link to="/announcements" className="hover:underline">Announcements</Link>
              <Link to="/knowledgebase" className="hover:underline">Knowledgebase</Link>
              <Link to="/downloads" className="text-mint hover:underline">Downloads</Link>
              <Link to="/network-status" className="text-mint hover:underline">Network Status</Link>
              <Link to="/tickets/open" className="text-mint hover:underline">Open Ticket</Link>
              <Link to="/affiliates" className="text-mint hover:underline">Affiliates</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-white/15 pt-4 text-[12px] sm:flex-row sm:items-center">
          <p className="text-white">Copyright © 2026 Hostuner Webhosting. All Rights Reserved.</p>
          <p className="text-mint">Hostuner-25 Portal • Terms of Service</p>
        </div>
      </div>
    </footer>
  )
}
