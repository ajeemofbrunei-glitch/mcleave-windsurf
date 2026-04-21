import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMonitoring } from './ErrorMonitoring';

export function AdminSettings({ onToast }: {
  onToast: (title: string, msg: string, type: string, icon: string) => void;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'monitoring'>('account');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [adminPlan, setAdminPlan] = useState<'free' | 'pro'>('free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      loadProfile();
    }
  }, [user]);

  async function loadProfile() {
    if (!user) return;

    try {
      const admin = await adminApi.getProfileByEmail(user.email || '');

      if (admin) {
        setStoreName(admin.store_name);
        setAdminPlan(admin.plan || 'free');
        setWhatsappEnabled(admin.whatsapp_enabled || false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function updateStoreName() {
    if (!user || !storeName.trim()) {
      onToast('Error', 'Please enter a store name', 'denied', '❌');
      return;
    }

    setLoading(true);

    try {
      await adminApi.updateAdmin(user.id, { store_name: storeName });
      onToast('Success', 'Store name updated successfully', 'success', '✅');
    } catch (error: any) {
      onToast('Error', error.message || 'Failed to update store name', 'denied', '❌');
    }

    setLoading(false);
  }

  async function updateEmail() {
    if (!email.trim() || !email.includes('@')) {
      onToast('Error', 'Please enter a valid email', 'denied', '❌');
      return;
    }

    onToast('Info', 'Email update not available in local mode', 'info', 'ℹ️');
  }

  async function updatePassword() {
    if (!newPassword) {
      onToast('Error', 'Please enter a new password', 'denied', '❌');
      return;
    }

    if (newPassword !== confirmPassword) {
      onToast('Error', 'Passwords do not match', 'denied', '❌');
      return;
    }

    if (!user?.id) {
      onToast('Error', 'User not found', 'denied', '❌');
      return;
    }

    // Password complexity validation
    const errors = [];
    if (newPassword.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(newPassword)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(newPassword)) errors.push('one lowercase letter');
    if (!/[0-9]/.test(newPassword)) errors.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) errors.push('one special character');

    if (errors.length > 0) {
      onToast('Error', `Password must contain ${errors.join(', ')}`, 'denied', '❌');
      return;
    }

    setLoading(true);

    try {
      await adminApi.resetPassword(user.id, newPassword);
      onToast('Success', 'Password updated successfully', 'success', '✅');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      onToast('Error', error.message || 'Failed to update password', 'denied', '❌');
    }

    setLoading(false);
  }

  async function toggleWhatsApp() {
    if (adminPlan === 'free') {
      setShowUpgradeModal(true);
      return;
    }

    if (!user) return;

    const newValue = !whatsappEnabled;
    setLoading(true);

    try {
      await adminApi.updateAdmin(user.id, { whatsapp_enabled: newValue });
      setWhatsappEnabled(newValue);
      if (newValue) {
        onToast('Success', 'WhatsApp notifications enabled ✅', 'success', '📱');
      } else {
        onToast('Success', 'WhatsApp notifications disabled', 'info', '📱');
      }
    } catch (error: any) {
      onToast('Error', error.message || 'Failed to update WhatsApp settings', 'denied', '❌');
    }

    setLoading(false);
  }

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>
      <div style={{
        background: 'linear-gradient(135deg, #DA291C 0%, #b71c1c 100%)',
        borderRadius: 20,
        padding: 40,
        marginBottom: 30,
        color: '#fff'
      }}>
        <h1 style={{
          fontFamily: 'Impact, var(--mono), sans-serif',
          fontSize: 32,
          fontWeight: 900,
          margin: 0,
          letterSpacing: 2
        }}>
          ⚙️ Settings
        </h1>
        <p style={{ fontSize: 15, opacity: 0.9, margin: '8px 0 0 0' }}>
          Manage your account preferences and system monitoring
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        borderBottom: '2px solid var(--border)',
        paddingBottom: 2
      }}>
        <button
          onClick={() => setActiveTab('account')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'account' ? '3px solid var(--accent)' : '3px solid transparent',
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            color: activeTab === 'account' ? 'var(--accent)' : 'var(--muted)',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
            transition: 'all 0.2s',
            marginBottom: -2
          }}
        >
          Account Settings
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'monitoring' ? '3px solid var(--accent)' : '3px solid transparent',
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            color: activeTab === 'monitoring' ? 'var(--accent)' : 'var(--muted)',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
            transition: 'all 0.2s',
            marginBottom: -2
          }}
        >
          System Health
        </button>
      </div>

      {activeTab === 'account' && (
        <div style={{
          display: 'grid',
          gap: 24
        }}>
        <SettingsCard
          title="Store Information"
          icon="🏪"
          description="Update your store's display name"
        >
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Store Name
            </label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="Enter store name"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>
          <button
            onClick={updateStoreName}
            disabled={loading}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'var(--sans)'
            }}
          >
            {loading ? 'Updating...' : 'Update Store Name'}
          </button>
        </SettingsCard>

        <SettingsCard
          title="Email Address"
          icon="📧"
          description="Update your login email address"
        >
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>
          <button
            onClick={updateEmail}
            disabled={loading}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'var(--sans)'
            }}
          >
            {loading ? 'Updating...' : 'Update Email'}
          </button>
        </SettingsCard>

        <SettingsCard
          title="Change Password"
          icon="🔒"
          description="Update your account password"
        >
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none',
                transition: 'border-color 0.2s',
                marginBottom: 12
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>
          <button
            onClick={updatePassword}
            disabled={loading}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'var(--sans)'
            }}
          >
            {loading ? 'Updating...' : 'Change Password'}
          </button>
        </SettingsCard>

        <SettingsCard
          title="Notifications"
          icon="📱"
          description="Manage WhatsApp notification preferences"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: adminPlan === 'free' ? '#f9fafb' : 'rgba(255, 199, 44, 0.1)',
            border: `2px solid ${adminPlan === 'free' ? '#e5e7eb' : '#fbbf24'}`,
            borderRadius: 12,
            marginBottom: 12
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: adminPlan === 'free' ? '#9ca3af' : 'var(--text)',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                WhatsApp Notifications
                {adminPlan === 'free' && (
                  <span style={{
                    fontSize: 11,
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 600
                  }}>
                    PRO
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 13,
                color: adminPlan === 'free' ? '#9ca3af' : 'var(--muted)',
                lineHeight: 1.5
              }}>
                Send WhatsApp message to crew when leave is approved or denied
              </div>
            </div>
            <button
              onClick={toggleWhatsApp}
              disabled={loading}
              style={{
                position: 'relative',
                width: 56,
                height: 32,
                borderRadius: 16,
                border: 'none',
                cursor: adminPlan === 'free' ? 'not-allowed' : (loading ? 'not-allowed' : 'pointer'),
                background: whatsappEnabled && adminPlan === 'pro' ? '#fbbf24' : '#e5e7eb',
                transition: 'background 0.3s',
                opacity: loading ? 0.6 : 1
              }}
            >
              <div style={{
                position: 'absolute',
                top: 4,
                left: whatsappEnabled && adminPlan === 'pro' ? 28 : 4,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.3s'
              }} />
            </button>
          </div>
          {adminPlan === 'free' && (
            <div style={{
              fontSize: 12,
              color: '#6b7280',
              fontStyle: 'italic',
              padding: '8px 12px',
              background: '#fef3c7',
              borderRadius: 8,
              border: '1px solid #fbbf24'
            }}>
              This feature requires a Pro plan. Contact your administrator to upgrade.
            </div>
          )}
        </SettingsCard>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <ErrorMonitoring />
      )}

      {showUpgradeModal && (
        <div
          onClick={() => setShowUpgradeModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: 40,
              maxWidth: 480,
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
            <h2 style={{
              fontFamily: 'var(--mono)',
              fontSize: 24,
              fontWeight: 800,
              marginBottom: 12
            }}>
              Pro Feature
            </h2>
            <p style={{
              fontSize: 15,
              color: 'var(--muted)',
              lineHeight: 1.6,
              marginBottom: 24
            }}>
              WhatsApp Notifications is only available on the Pro Plan.
            </p>
            <div style={{
              background: '#fef3c7',
              border: '2px solid #fbbf24',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: 14,
                color: '#92400e',
                lineHeight: 2,
                marginBottom: 16
              }}>
                ✅ Instant crew notifications<br />
                ✅ Leave approval alerts<br />
                ✅ Denial notifications with reason
              </div>
              <div style={{
                borderTop: '1px solid #fbbf24',
                paddingTop: 16,
                fontSize: 13,
                color: '#92400e'
              }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Setup Fee:</strong> $50 (one-time)
                </div>
                <div>
                  <strong>Monthly:</strong> $10/month
                </div>
              </div>
            </div>
            <p style={{
              fontSize: 13,
              color: 'var(--muted)',
              marginBottom: 20
            }}>
              Contact your administrator to upgrade.
            </p>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 32px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--sans)'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsCard({ title, icon, description, children }: {
  title: string;
  icon: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '2px solid var(--border)',
      borderRadius: 18,
      padding: 30
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <div>
          <h2 style={{
            fontFamily: 'var(--mono)',
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--text)',
            margin: 0
          }}>
            {title}
          </h2>
          <p style={{
            fontSize: 13,
            color: 'var(--muted)',
            margin: '4px 0 0 0'
          }}>
            {description}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
