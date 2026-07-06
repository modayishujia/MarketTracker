import { useTranslation } from 'react-i18next'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation()
  const navItems = [
    { key: 'feeds', icon: '\u{1F4F0}', label: t('nav.feeds') },
    { key: 'articles', icon: '\u{1F4C4}', label: t('nav.articles') },
    { key: 'favorites', icon: '\u2B50', label: t('nav.favorites') },
    { key: 'analysis', icon: '\u{1F4CA}', label: t('nav.analysis') },
    { key: 'settings', icon: '\u2699\uFE0F', label: t('nav.settings') }
  ]

  return (
    <aside className="w-48 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">{t('app.title')}</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md mb-1 transition-colors ${
              currentPage === item.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
