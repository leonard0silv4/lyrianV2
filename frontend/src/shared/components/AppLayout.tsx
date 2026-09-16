import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../modules/auth/AuthContext";
import { usePermission } from "../../modules/permissions/usePermission";
import { useTheme } from "../theme/ThemeContext";

type NavItem = {
  to: string;
  icon: string;
  label: string;
  permission: string;
  staffOnly: boolean;
  /** Se true, só marca ativo em match exato de `to` (ignora sub-rotas por prefixo). */
  exact?: boolean;
  /** Rotas extras (fora de `to`) que também devem marcar este item como ativo. */
  extraMatch?: RegExp;
};

// `/ateliers` e `/pagamentos` compartilham sub-rotas aninhadas sob "/ateliers/:id/..."
// (mesa de produção e pagamento por ateliê) — por isso "Ateliês" usa `exact` (não
// marca ativo em qualquer /ateliers/*) e cada item declara explicitamente quais
// dessas sub-rotas lhe pertencem via `extraMatch`, evitando que o prefixo comum
// "/ateliers" marque o item errado como ativo.
const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    icon: "fa-gauge-high",
    label: "Dashboard",
    permission: "work-queue:read",
    staffOnly: true,
  },
  {
    to: "/ateliers",
    icon: "fa-industry",
    label: "Ateliês",
    permission: "ateliers:read",
    staffOnly: true,
    exact: true,
    extraMatch: /^\/ateliers\/[^/]+\/mesa(\/|$)/,
  },
  {
    to: "/medidas",
    icon: "fa-ruler",
    label: "Medidas",
    permission: "measurements:read",
    staffOnly: true,
  },
  // {
  //   to: '/auditoria',
  //   icon: 'fa-shield-halved',
  //   label: 'Auditoria',
  //   permission: 'work-queue:baselinker-push',
  //   staffOnly: true,
  // },
  {
    to: "/pagamentos",
    icon: "fa-sack-dollar",
    label: "Pagamentos",
    permission: "payments:manage",
    staffOnly: true,
    extraMatch: /^\/ateliers\/[^/]+\/pagamento(\/|$)/,
  },
  {
    to: "/usuarios",
    icon: "fa-users",
    label: "Usuários",
    permission: "users:manage",
    staffOnly: true,
  },
  {
    to: "/logs",
    icon: "fa-clipboard-list",
    label: "Logs",
    permission: "audit:read",
    staffOnly: true,
  },
];

function isNavItemActive(pathname: string, item: NavItem) {
  const matchesBase = item.exact
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(item.to + "/");
  return matchesBase || Boolean(item.extraMatch?.test(pathname));
}

export function AppLayout() {
  const { principal, logout } = useAuth();
  const { can, isAtelier } = usePermission();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const initials = (principal?.username || "??").slice(0, 2).toUpperCase();

  return (
    <div>
      <nav className="lya-topnav">
        <Link to="/" className="lya-topnav-brand">
          <span className="lya-topnav-logo">
            <i className="fa-solid fa-scissors" />
          </span>
          <span className="lya-topnav-title">Lyria Ateliês</span>
        </Link>

        <div className="lya-topnav-links">
          {!isAtelier &&
            NAV_ITEMS.filter((item) => can(item.permission)).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`lya-topnav-link ${isNavItemActive(location.pathname, item) ? "active" : ""}`}
              >
                <i className={`fa-solid ${item.icon}`} />
                {item.label}
              </Link>
            ))}
          {isAtelier && (
            <Link
              to="/portal"
              className={`lya-topnav-link ${location.pathname.startsWith("/portal") ? "active" : ""}`}
            >
              <i className="fa-solid fa-layer-group" />
              Meus Trabalhos
            </Link>
          )}
        </div>

        <div className="lya-topnav-right">
          <div className="lya-topnav-user">
            <span className="lya-topnav-avatar">{initials}</span>
            <div className="lya-topnav-userinfo">
              <span className="lya-topnav-username">{principal?.username}</span>
              {principal?.role && (
                <span className="lya-topnav-role">{principal.role}</span>
              )}
            </div>
          </div>
          <button
            className="lya-topnav-logout"
            onClick={toggleTheme}
            aria-label="Alternar tema"
            title="Alternar tema"
          >
            <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`} />
          </button>
          <button
            className="lya-topnav-logout"
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair"
          >
            <i className="fa-solid fa-right-from-bracket" />
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
