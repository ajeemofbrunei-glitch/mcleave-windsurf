import { useState } from 'react';
import { supabase } from '../supabase';

interface CrewMember {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  id_no: string;
  is_active: boolean;
}

const DESIGNATIONS = ["Crew Trainer", "Core Crew", "Part Time Crew", "Barista", "GEL", "MDS", "VIP"];

export function CrewProfileEdit({
  crew,
  onClose,
  onUpdate,
  onToast
}: {
  crew: CrewMember;
  onClose: () => void;
  onUpdate: () => void;
  onToast: (title: string, msg: string, type: string, icon: string) => void;
}) {
  const [editForm, setEditForm] = useState({
    full_name: crew.full_name,
    email: crew.email,
    phone: crew.phone || '',
    designation: crew.designation || 'Core Crew',
    id_no: crew.id_no || ''
  });
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  async function handleUpdate() {
    if (!editForm.full_name.trim() || !editForm.email.trim()) {
      onToast('Error', 'Name and email are required', 'denied', '❌');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('crew_members')
      .update({
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone || null,
        designation: editForm.designation,
        id_no: editForm.id_no
      })
      .eq('id', crew.id);

    if (error) {
      onToast('Error', error.message, 'denied', '❌');
      setLoading(false);
    } else {
      onToast('Success', 'Profile updated successfully', 'success', '✅');
      setLoading(false);
      onUpdate();
      onClose();
    }
  }

  async function handlePasswordReset() {
    if (!newPassword || newPassword.length < 6) {
      onToast('Error', 'Password must be at least 6 characters', 'denied', '❌');
      return;
    }

    if (!confirm('Reset password for this crew member?')) return;

    setLoading(true);

    const { error } = await supabase.auth.admin.updateUserById(
      crew.id,
      { password: newPassword }
    );

    if (error) {
      onToast('Error', error.message, 'denied', '❌');
      setLoading(false);
    } else {
      onToast('Success', 'Password reset successfully', 'success', '✅');
      setNewPassword('');
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 30,
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--mono)',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--text)',
            margin: 0
          }}>
            Edit Crew Profile
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              color: 'var(--muted)',
              lineHeight: 1,
              padding: 0,
              width: 32,
              height: 32
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Full Name *
            </label>
            <input
              type="text"
              value={editForm.full_name}
              onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              ID Number
            </label>
            <input
              type="text"
              value={editForm.id_no}
              onChange={e => setEditForm({ ...editForm, id_no: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Email *
            </label>
            <input
              type="email"
              value={editForm.email}
              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Designation *
            </label>
            <select
              value={editForm.designation}
              onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none'
              }}
            >
              {DESIGNATIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '14px 24px',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily: 'var(--sans)',
            marginBottom: 20
          }}
        >
          {loading ? 'Updating...' : 'Update Profile'}
        </button>

        <div style={{
          borderTop: '2px solid var(--border)',
          paddingTop: 20
        }}>
          <h3 style={{
            fontFamily: 'var(--mono)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 16,
            textTransform: 'uppercase',
            letterSpacing: 1
          }}>
            Reset Password
          </h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
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
              placeholder="Minimum 6 characters"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: 10,
                fontSize: 15,
                fontFamily: 'var(--sans)',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handlePasswordReset}
            disabled={loading}
            style={{
              width: '100%',
              background: '#dc2626',
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
