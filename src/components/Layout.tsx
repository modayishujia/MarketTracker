import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div className="flex h-screen" style={{ background: 'linear-gradient(135deg, #06060a 0%, #0a0a12 50%, #06060a 100%)' }}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto" style={{ background: 'radial-gradient(ellipse at top, rgba(212, 168, 83, 0.02) 0%, transparent 50%)' }}>
        {children}
      </main>
    </div>
  )
}
