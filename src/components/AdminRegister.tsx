import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Arches = ({ size = 32, color = "#FFC72C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 80" fill="none">
    <path d="M10 70 Q10 10 30 10 Q50 10 50 40 Q50 10 70 10 Q90 10 90 70" stroke={color} strokeWidth="14" strokeLinecap="round" fill="none" />
  </svg>
);

interface RegisterForm {
  storeName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function AdminRegister({ onNavigateToLogin, onSuccess }: {
  onNavigateToLogin: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [form, setForm] = useState<RegisterForm>({
    storeName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  function validate() {
    const e: Partial<Record<keyof RegisterForm, string>> = {};
    if (!form.storeName.trim()) e.storeName = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Required";
    else if (form.password.length < 6) e.password = "Min 6 characters";
    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords don't match";
    return e;
  }

  async function handleRegister() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.storeName);

    if (error) {
      setErrors({ email: error.message });
      setLoading(false);
    } else {
      onSuccess(`Admin account created for ${form.storeName}! Please sign in.`);
      onNavigateToLogin();
    }
  }

  const field = (key: keyof RegisterForm, label: string, type = "text", ph = "") => (
    <div className={`auth-field ${errors[key] ? "has-err" : ""}`}>
      <label>{label}</label>
      <input
        type={type}
        value={form[key]}
        placeholder={ph}
        onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))}
      />
      {errors[key] && <span className="field-err">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="mc-header">
          <Arches size={40} color="#FFC72C" />
          <div className="auth-logo">McLeave<span>™</span></div>
          <div className="auth-tagline">Register Your Store</div>
        </div>

        {field("storeName", "Store Name", "text", "e.g. Store 1, Branch A")}
        {field("email", "Admin Email", "email", "admin@yourstore.com")}
        {field("password", "Password", "password", "min 6 characters")}
        {field("confirmPassword", "Confirm Password", "password", "repeat password")}

        <button className="auth-btn" onClick={handleRegister} disabled={loading}>
          {loading ? "Creating..." : "Create Admin Account →"}
        </button>

        <p className="auth-link">
          Already have an account? <button onClick={onNavigateToLogin}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
