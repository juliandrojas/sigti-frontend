import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '../api.js';
import { LoginForm, RoleSection } from './AppShell.jsx';

const SESSION_KEY = 'sigti.session';
const LOGIN_PATH = '/login';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export default function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [checking, setChecking] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname || LOGIN_PATH);

  useEffect(() => {
    if (!session) return;
    getCurrentUser(session.token)
      .then((user) => setSession((current) => ({ ...current, user })))
      .catch(() => {
        localStorage.removeItem(SESSION_KEY);
        setSession(null);
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (session || path === LOGIN_PATH) return;
    window.history.replaceState({}, '', LOGIN_PATH);
    setPath(LOGIN_PATH);
  }, [path, session]);

  useEffect(() => {
    if (!session) return;
    const isSystems = String(session.user.role).toUpperCase() === 'SISTEMAS';
    const prefix = isSystems ? '/sistemas/' : '/empleados/';
    const destination = isSystems ? '/sistemas/inicio' : '/empleados/solicitud';
    if (!path.startsWith(prefix)) {
      window.history.replaceState({}, '', destination);
      setPath(destination);
    }
  }, [path, session]);

  useEffect(() => {
    if (!session) return;
    let timeoutId = window.setTimeout(expireSession, INACTIVITY_TIMEOUT_MS);
    let activityThrottleId = null;
    function scheduleExpiration() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(expireSession, INACTIVITY_TIMEOUT_MS);
    }
    function onActivity() {
      if (activityThrottleId !== null) return;
      activityThrottleId = window.setTimeout(() => {
        activityThrottleId = null;
        scheduleExpiration();
      }, 1000);
    }
    function expireSession() {
      localStorage.removeItem(SESSION_KEY);
      window.history.replaceState({}, '', LOGIN_PATH);
      setPath(LOGIN_PATH);
      setSession(null);
    }
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));
    return () => {
      window.clearTimeout(timeoutId);
      if (activityThrottleId !== null) window.clearTimeout(activityThrottleId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, [session]);

  function handleLogin(nextSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    const isSystems = String(nextSession.user.role).toUpperCase() === 'SISTEMAS';
    const destination = isSystems ? '/sistemas/inicio' : '/empleados/solicitud';
    window.history.replaceState({}, '', destination);
    setPath(destination);
    setSession(nextSession);
  }

  function navigate(nextPath) {
    const nextUrl = new URL(nextPath, window.location.origin);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const normalizedNextUrl = `${nextUrl.pathname}${nextUrl.search}`;
    if (normalizedNextUrl === currentUrl) return;
    window.history.pushState({}, '', normalizedNextUrl);
    setPath(nextUrl.pathname);
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    window.history.replaceState({}, '', LOGIN_PATH);
    setPath(LOGIN_PATH);
    setSession(null);
  }

  if (checking) return <main className="loading">Validando sesión…</main>;
  return session
    ? <RoleSection user={session.user} token={session.token} path={path} onLogout={handleLogout} onNavigate={navigate} />
    : <LoginForm onLogin={handleLogin} />;
}
