export function PortalBottomNav({
  tab,
  onTabChange,
  onAtelieClick,
}: {
  tab: string
  onTabChange: (tab: string) => void
  onAtelieClick: () => void
}) {
  return (
    <nav className="lya-bottom-nav">
      <button
        className={`lya-bottom-nav-item ${tab === 'todos' ? 'active' : ''}`}
        onClick={() => onTabChange('todos')}
      >
        <i className="fa-solid fa-house" />
        <span>Início</span>
      </button>
      <button
        className={`lya-bottom-nav-item ${tab === 'em_producao' ? 'active' : ''}`}
        onClick={() => onTabChange('em_producao')}
      >
        <i className="fa-solid fa-scissors" />
        <span>Costura</span>
      </button>
      <button
        className={`lya-bottom-nav-item ${tab === 'pronto' ? 'active' : ''}`}
        onClick={() => onTabChange('pronto')}
      >
        <i className="fa-solid fa-box-open" />
        <span>Prontos</span>
      </button>
      <button className="lya-bottom-nav-item" onClick={onAtelieClick}>
        <i className="fa-solid fa-user-gear" />
        <span>Ateliê</span>
      </button>
    </nav>
  )
}
