import { useTranslation } from 'react-i18next'

export function AIBriefing() {
  const { t, i18n } = useTranslation()

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
      gap: '16px'
    }}>
      <div style={{ fontSize: '64px', opacity: 0.15 }}>🤖</div>
      <div style={{
        fontSize: '18px',
        fontWeight: '600',
        color: 'var(--text-secondary)'
      }}>
        {t('brief.title')}
      </div>
      <div style={{
        padding: '6px 16px',
        background: 'var(--accent-gold-dim)',
        border: '1px solid var(--border-accent)',
        borderRadius: '20px',
        fontSize: '12px',
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--accent-gold)'
      }}>
        {i18n.language === 'zh' ? '正在开发中' : 'Coming Soon'}
      </div>
      <div style={{
        fontSize: '13px',
        color: 'var(--text-muted)',
        maxWidth: '320px',
        textAlign: 'center',
        lineHeight: '1.6'
      }}>
        {i18n.language === 'zh'
          ? 'AI 智能简报功能正在开发中，敬请期待'
          : 'AI briefing feature is under development'}
      </div>
    </div>
  )
}
