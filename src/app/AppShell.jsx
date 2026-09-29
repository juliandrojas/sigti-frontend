import React, { useState } from 'react';
import { login } from '../api.js';
import { EmployeeDashboard, InventoryOverview, LoansOverview, MaintenanceRecordsOverview, RequestForm, RequestsOverview, SystemDashboard, SystemMetrics, UserRequests } from '../features/modules.jsx';

export function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      onLogin(await login({ username, password }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-layout">
    <section className="brand-panel">
      <p className="eyebrow">PETROCASINOS S.A.</p>
      <h1>SIGTI</h1>
      <p>Sistema Integrado de Gestión de Tecnologías de la Información</p>
    </section>
    <section className="login-panel" aria-labelledby="login-title">
      <form onSubmit={submit} className="login-form">
        <p className="eyebrow">ACCESO SEGURO</p>
        <h2 id="login-title">Bienvenido de nuevo</h2>
        <p className="muted">Ingresa con tu cuenta corporativa.</p>
        <label htmlFor="username">Nombre de usuario</label>
        <input id="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        <label htmlFor="password">Contraseña</label>
        <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Iniciar sesión'}</button>
      </form>
    </section>
  </main>;
}

export function RoleSection({ user, token, path, onLogout, onNavigate }) {
  const isSystems = String(user.role).toUpperCase() === 'SISTEMAS';
  return <>
    <Navigation isSystems={isSystems} path={path} onLogout={onLogout} onNavigate={onNavigate} />
    <main className="dashboard">
      {isSystems
        ? path === '/sistemas/inicio' ? <SystemDashboard token={token} user={user} /> : <SystemsSection token={token} user={user} path={path} onNavigate={onNavigate} />
        : path === '/empleados/solicitud' ? <RequestForm token={token} user={user} onNavigate={onNavigate} />
          : path === '/empleados/solicitudes' ? <UserRequests token={token} />
            : <EmployeeDashboard token={token} user={user} />}
    </main>
  </>;
}

export function Navigation({ isSystems, path, onLogout, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = isSystems
    ? [['⌂', 'Inicio', '/sistemas/inicio'], ['▦', 'Inventario', '/sistemas/inventario'], ['⇄', 'Préstamos y solicitudes', '/sistemas/prestamos'], ['⚑', 'Solicitudes', '/sistemas/solicitudes'], ['⚒', 'Mantenimiento', '/sistemas/mantenimiento']]
    : [['➤', 'Hacer una solicitud', '/empleados/solicitud'], ['☷', 'Mis solicitudes', '/empleados/solicitudes']];

  function navigate(href) {
    setMenuOpen(false);
    onNavigate(href);
  }

  return <nav className="topbar" aria-label="Navegación principal">
    <div className="topbar-content">
      <a className="brand" href={isSystems ? '/sistemas/inicio' : '/empleados/inicio'} onClick={(event) => { event.preventDefault(); navigate(isSystems ? '/sistemas/inicio' : '/empleados/inicio'); }} aria-label="Ir al inicio de SIGTI">
        <img className="brand-mark" src="/petrocasinos-logo.png" alt="Logo Petrocasinos" /><span>PETRO-SIGTI</span>
      </a>
      <button className="nav-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}>
        <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        <span className="sr-only">{menuOpen ? 'Cerrar menú' : 'Abrir menú'}</span>
      </button>
      <div id="primary-navigation" className={`nav-menu ${menuOpen ? 'open' : ''}`}>
        <div className="nav-links">
          {links.map(([icon, label, href]) => { const active = href === '/sistemas/mantenimiento' ? path.startsWith('/sistemas/mantenimiento') : href === '/sistemas/inventario' ? path.startsWith('/sistemas/inventario') : path === href; return <a className={`nav-link ${active ? 'active' : ''}`} href={href} onClick={(event) => { event.preventDefault(); navigate(href); }} aria-current={active ? 'page' : undefined} key={label}><span aria-hidden="true">{icon}</span>{label}</a>; })}
        </div>
        <div className="nav-actions"><button className="logout" type="button" onClick={() => { setMenuOpen(false); onLogout(); }}>⇥ Cerrar sesión</button></div>
      </div>
    </div>
  </nav>;
}

export function SystemsSection({ token, user, path, onNavigate }) {
  if (path === '/sistemas/inventario/nuevo') return <InventoryOverview token={token} onNavigate={onNavigate} openRegister />;
  if (path === '/sistemas/inventario/editar') return <InventoryOverview token={token} onNavigate={onNavigate} initialEditId={new URLSearchParams(window.location.search).get('id')} />;
  if (path === '/sistemas/inventario') return <InventoryOverview token={token} onNavigate={onNavigate} />;
  if (path === '/sistemas/mantenimiento') return <MaintenanceRecordsOverview token={token} onNavigate={onNavigate} />;
  if (path === '/sistemas/prestamos') return <LoansOverview token={token} />;
  if (path === '/sistemas/solicitudes') return <RequestsOverview token={token} />;
  return <SystemMetrics token={token} />;
}
