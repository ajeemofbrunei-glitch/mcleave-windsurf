import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi, crewApi } from '../api';

interface Store {
  id: string;
  store_name: string;
}

const Arches = ({ size = 32, color = "#FFC72C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 80" fill="none">
    <path d="M10 70 Q10 10 30 10 Q50 10 50 40 Q50 10 70 10 Q90 10 90 70" stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
  </svg>
);

export function CrewLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [designation, setDesignation] = useState('Core Crew');
  const [idNo, setIdNo] = useState('');
  const { signIn } = useAuth();

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      const admins = await adminApi.getAllAdmins();
      const storeAdmins = admins
        .filter(admin => admin.role !== 'master_admin')
        .map(admin => ({ id: admin.id, store_name: admin.store_name }));
      setStores(storeAdmins);
    } catch (err) {
      console.error('Failed to load stores:', err);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password, 'crew');
      if (signInError) throw signInError;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!fullName || !email || !password || !selectedStore || !designation) {
        throw new Error('Please fill in all required fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      // Register crew member
      await crewApi.crewSignup({
        name: fullName,
        username: email,
        phone: phone || '',
        designation,
        password,
        admin_id: selectedStore,
      });

      setSuccess('Registration successful! You can now sign in.');
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setSelectedStore('');
      setDesignation('Core Crew');
      setIdNo('');

      setTimeout(() => {
        setIsRegistering(false);
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="mc-header">
          <Arches size={48} color="#FFC72C" />
          <div className="auth-logo">McLeave<span>™</span></div>
          <div className="auth-tagline">Crew Portal - I'm Scheduling It™</div>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 600,
            textAlign: 'center'
          }}>
            ⚠ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#dcfce7',
            color: '#166534',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 600,
            textAlign: 'center'
          }}>
            ✓ {success}
          </div>
        )}

        {!isRegistering ? (
          <>
            <div className="auth-field">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="crew@store.com"
                onKeyDown={e => e.key === "Enter" && handleLogin(e)}
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
                  onKeyDown={e => e.key === "Enter" && handleLogin(e)}
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

            <button className="auth-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>

            <p className="auth-link">
              Don't have an account?{' '}
              <button onClick={() => setIsRegistering(true)}>
                Register here
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="auth-field">
              <label>Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="auth-field">
              <label>Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="crew@store.com"
              />
            </div>

            <div className="auth-field">
              <label>ID Number</label>
              <input
                type="text"
                value={idNo}
                onChange={e => setIdNo(e.target.value)}
                placeholder="Employee ID"
              />
            </div>

            <div className="auth-field">
              <label>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>

            <div className="auth-field">
              <label>Designation *</label>
              <select
                value={designation}
                onChange={e => setDesignation(e.target.value)}
              >
                <option value="Crew Trainer">Crew Trainer</option>
                <option value="Core Crew">Core Crew</option>
                <option value="Part Time Crew">Part Time Crew</option>
                <option value="Barista">Barista</option>
                <option value="GEL">GEL</option>
                <option value="MDS">MDS</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div className="auth-field">
              <label>Store Location *</label>
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
              >
                <option value="">Select your store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.store_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-field">
              <label>Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
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

            <button className="auth-btn" onClick={handleRegister} disabled={loading}>
              {loading ? "Registering..." : "Register →"}
            </button>

            <p className="auth-link">
              Already have an account?{' '}
              <button onClick={() => setIsRegistering(false)}>
                Sign in here
              </button>
            </p>
          </>
        )}

        <div className="mc-footer-badge">🍟 McDonald's Crew Leave Management</div>
      </div>
    </div>
  );
}
