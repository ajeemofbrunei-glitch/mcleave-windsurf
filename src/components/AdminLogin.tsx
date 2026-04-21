import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Arches = ({ size = 32, color = "#FFC72C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 80" fill="none">
    <path d="M10 70 Q10 10 30 10 Q50 10 50 40 Q50 10 70 10 Q90 10 90 70" stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
  </svg>
);

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleLogin() {
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await signIn(email, password, 'admin');

    if (signInError) {
      setError("Invalid email or password.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="mc-header">
          <Arches size={48} color="#FFC72C" />
          <div className="auth-logo">McLeave<span>™</span></div>
          <div className="auth-tagline">Admin Portal - I'm Scheduling It™</div>
        </div>

        <div className="auth-field">
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@store1.com"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
        </div>

        <div className="auth-field">
          <label>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ paddingRight: 42, width: "100%" }}
            />
            <button
              onClick={() => setShowPw(v => !v)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: 16
              }}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {error && <div className="auth-err">⚠ {error}</div>}

        <button className="auth-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        <div className="mc-footer-badge">🍟 McDonald's Admin Leave Management</div>
      </div>
    </div>
  );
}
