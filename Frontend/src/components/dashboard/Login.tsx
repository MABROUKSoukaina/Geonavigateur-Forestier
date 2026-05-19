import { useState } from 'react';
import ForestIcon from '@mui/icons-material/Forest';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

interface Props {
  onLogin: (token: string, username: string) => void;
}

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'user' | 'pwd' | null>(null);

  const submit = async () => {
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Identifiants incorrects');
        return;
      }
      localStorage.setItem('jwt_token', body.token);
      localStorage.setItem('jwt_username', body.username);
      onLogin(body.token, body.username);
    } catch {
      setError('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: 'user' | 'pwd'): React.CSSProperties => ({
    width: '100%',
    padding: '13px 14px 13px 42px',
    borderRadius: 12,
    fontSize: 14,
    background: 'rgba(255,255,255,0.05)',
    border: `1.5px solid ${focused === field ? '#10b981' : error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
    color: '#f1f5f9',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1628 0%, #0f2744 50%, #0a1628 100%)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(16,185,129,0.07)', filter: 'blur(80px)', top: '-10%', left: '-5%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(56,189,248,0.06)', filter: 'blur(60px)', bottom: '5%', right: '5%', pointerEvents: 'none' }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '48px 52px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        minWidth: 360, backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
        }}>
          <ForestIcon style={{ fontSize: 32, color: '#fff' }} />
        </div>

        <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 4 }}>
          Géo Navigateur Forestier
        </div>
        <div style={{ color: '#475569', fontSize: 13, marginBottom: 36 }}>
          Inventaire Forestier National 2026
        </div>

        {/* Username */}
        <div style={{ width: '100%', marginBottom: 14 }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: focused === 'user' ? '#10b981' : '#475569',
              display: 'flex', alignItems: 'center', transition: 'color 0.2s', pointerEvents: 'none',
            }}>
              <PersonOutlineIcon style={{ fontSize: 18 }} />
            </span>
            <input
              type="text"
              placeholder="Identifiant"
              value={username}
              autoFocus
              onChange={e => { setUsername(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              onFocus={() => setFocused('user')}
              onBlur={() => setFocused(null)}
              style={inputStyle('user')}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ width: '100%', marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: focused === 'pwd' ? '#10b981' : '#475569',
              display: 'flex', alignItems: 'center', transition: 'color 0.2s', pointerEvents: 'none',
            }}>
              <LockOutlinedIcon style={{ fontSize: 18 }} />
            </span>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              onFocus={() => setFocused('pwd')}
              onBlur={() => setFocused(null)}
              style={inputStyle('pwd')}
            />
          </div>
          <div style={{
            height: 18, marginTop: 6, paddingLeft: 4,
            color: '#ef4444', fontSize: 12,
            opacity: error ? 1 : 0, transition: 'opacity 0.2s',
          }}>
            {error ?? ' '}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
            opacity: loading ? 0.7 : 1, letterSpacing: '0.3px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.7' : '1'; }}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>

        <div style={{ color: '#334155', fontSize: 11, marginTop: 28 }}>
          Inventaire Forestier National © 2026
        </div>
      </div>
    </div>
  );
}
