import { useState, useEffect } from 'react';
import { crewApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { CrewProfileEdit } from './CrewProfileEdit';
import { getDesignationColor } from '../utils/designationColors';

interface CrewMember {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  id_no: string;
  is_active: boolean;
  created_at: string;
}

export function CrewManagement({ onToast }: {
  onToast: (title: string, msg: string, type: string, icon: string) => void;
}) {
  const { user } = useAuth();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newCrew, setNewCrew] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    designation: 'Core Crew',
    id_no: ''
  });
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);

  useEffect(() => {
    loadCrew();
  }, []);

  async function loadCrew() {
    if (!user) return;

    setLoading(true);
    try {
      const crews = await crewApi.getCrewsByAdmin(user.id);
      console.log('Loaded crews:', crews);
      setCrew(crews.map(c => {
        const isActive = c.is_active === 1 || c.is_active === true;
        console.log('Crew:', c.name, 'is_active raw:', c.is_active, '-> boolean:', isActive);
        return {
          id: c.id,
          full_name: c.name,
          email: c.username,
          phone: c.phone,
          designation: c.designation,
          id_no: '',
          is_active: isActive,
          created_at: c.created_at || ''
        };
      }));
    } catch (error: any) {
      onToast('Error', error.message || 'Failed to load crew', 'denied', '❌');
    }
    setLoading(false);
  }

  async function addCrewMember() {
    if (!user || !newCrew.full_name.trim() || !newCrew.email.trim() || !newCrew.password) {
      onToast('Error', 'Please fill in all required fields', 'denied', '❌');
      return;
    }

    if (newCrew.password.length < 6) {
      onToast('Error', 'Password must be at least 6 characters', 'denied', '❌');
      return;
    }

    setLoading(true);

    try {
      const crewId = `crew-${Date.now()}`;
      await crewApi.createCrew({
        id: crewId,
        name: newCrew.full_name,
        username: newCrew.email,
        phone: newCrew.phone || '',
        designation: newCrew.designation,
        password: newCrew.password,
        joined_at: new Date().toISOString().split('T')[0],
        admin_id: user.id
      });

      onToast('Success', 'Crew member added successfully', 'success', '✅');
      setNewCrew({ full_name: '', email: '', phone: '', password: '', designation: 'Core Crew', id_no: '' });
      setShowAddForm(false);
      loadCrew();
    } catch (error: any) {
      onToast('Error', error.message || 'Failed to add crew member', 'denied', '❌');
    }

    setLoading(false);
  }

  async function toggleCrewStatus(crewId: string, currentStatus: boolean) {
    console.log('Toggling crew status:', { crewId, currentStatus, newStatus: !currentStatus });
    try {
      const response = await crewApi.updateCrew(crewId, { is_active: !currentStatus });
      console.log('Update response:', response);
      onToast('Success', `Crew member ${currentStatus ? 'deactivated' : 'activated'}`, 'success', '✅');
      // Wait a moment for DB to update, then reload
      setTimeout(() => {
        console.log('Reloading crew data...');
        loadCrew();
      }, 500);
    } catch (error: any) {
      console.error('Toggle error:', error);
      onToast('Error', error.message || 'Failed to update crew status', 'denied', '❌');
    }
  }

  async function deleteCrewMember(crewId: string) {
    if (!confirm('Are you sure you want to delete this crew member? This will also delete their leave requests.')) {
      return;
    }

    try {
      await crewApi.deleteCrew(crewId);
      onToast('Success', 'Crew member deleted', 'success', '✅');
      loadCrew();
    } catch (error: any) {
      onToast('Error', error.message || 'Failed to delete crew member', 'denied', '❌');
    }
  }

  function downloadTemplate() {
    const templateData = [
      ['Name', 'Email', 'Phone', 'Password'],
      ['John Doe', 'john@example.com', '+1234567890', 'SecurePass123'],
      ['Jane Smith', 'jane@example.com', '+0987654321', 'SecurePass456']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Crew Members');
    XLSX.writeFile(wb, 'crew_members_template.xlsx');
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          onToast('Error', 'File must have headers and at least 1 data row', 'denied', '❌');
          return;
        }

        const headers = jsonData[0].map((h: any) => (h || '').toString().toLowerCase().trim());

        const nameIndex = headers.findIndex(h => h.includes('name'));
        const emailIndex = headers.findIndex(h => h.includes('email'));
        const phoneIndex = headers.findIndex(h => h.includes('phone'));
        const passwordIndex = headers.findIndex(h => h.includes('password'));

        if (nameIndex === -1 || emailIndex === -1 || passwordIndex === -1) {
          onToast('Error', `Missing columns. Found: ${headers.join(', ')}. Need: Name, Email, Password`, 'denied', '❌');
          return;
        }

        setLoading(true);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const name = row[nameIndex] ? row[nameIndex].toString().trim() : '';
          const email = row[emailIndex] ? row[emailIndex].toString().trim() : '';
          const phone = phoneIndex !== -1 && row[phoneIndex] ? row[phoneIndex].toString().trim() : '';
          const password = row[passwordIndex] ? row[passwordIndex].toString().trim() : '';

          if (!name || !email || !password) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            errorCount++;
            continue;
          }

          try {
            const crewId = `crew-${Date.now()}-${i}`;
            await crewApi.createCrew({
              id: crewId,
              name: name,
              username: email,
              phone: phone || '',
              designation: 'Core Crew',
              password: password,
              joined_at: new Date().toISOString().split('T')[0],
              admin_id: user.id
            });
            successCount++;
          } catch (error: any) {
            errors.push(`Row ${i + 1} (${email}): ${error.message || 'Failed to create account'}`);
            errorCount++;
          }
        }

        setLoading(false);
        setShowUploadForm(false);
        loadCrew();

        if (successCount > 0) {
          onToast('Success', `Imported ${successCount} crew members${errorCount > 0 ? ` (${errorCount} failed)` : ''}`, 'success', '✅');
          if (errors.length > 0 && errors.length <= 5) {
            console.log('Upload errors:', errors);
          }
        } else {
          const errorMsg = errors.length > 0 ? errors[0] : 'No crew members were imported';
          onToast('Error', errorMsg, 'denied', '❌');
          console.log('All upload errors:', errors);
        }
      } catch (err) {
        setLoading(false);
        onToast('Error', `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`, 'denied', '❌');
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  }

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>
      <div style={{
        background: 'linear-gradient(135deg, #DA291C 0%, #b71c1c 100%)',
        borderRadius: 20,
        padding: '24px 20px',
        marginBottom: 24,
        color: '#fff'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
            <h1 style={{
              fontFamily: 'Impact, var(--mono), sans-serif',
              fontSize: 'clamp(22px, 5vw, 32px)',
              fontWeight: 900,
              margin: 0,
              letterSpacing: 2
            }}>
              👥 Crew Management
            </h1>
            <p style={{ fontSize: 'clamp(13px, 3vw, 15px)', opacity: 0.9, margin: '8px 0 0 0' }}>
              Manage your store's crew members
            </p>
          </div>
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '600px'
          }}>
            <button
              onClick={() => {
                setShowUploadForm(!showUploadForm);
                setShowAddForm(false);
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: 12,
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flex: '1 1 auto',
                minWidth: '140px',
                justifyContent: 'center'
              }}
            >
              {showUploadForm ? '✕ Cancel' : '📊 Upload Excel'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowUploadForm(false);
              }}
              style={{
                background: '#fff',
                color: 'var(--accent)',
                border: 'none',
                borderRadius: 12,
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flex: '1 1 auto',
                minWidth: '140px',
                justifyContent: 'center'
              }}
            >
              {showAddForm ? '✕ Cancel' : '+ Add Crew'}
            </button>
          </div>
        </div>
      </div>

      {showUploadForm && (
        <div style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderRadius: 18,
          padding: 'clamp(16px, 4vw, 30px)',
          marginBottom: 24
        }}>
          <h2 style={{
            fontFamily: 'var(--mono)',
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 20
          }}>
            Upload Crew Members from Excel
          </h2>

          <div style={{
            background: 'var(--bg)',
            padding: 20,
            borderRadius: 12,
            marginBottom: 20
          }}>
            <p style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text)' }}>
              <strong>File Format Requirements:</strong>
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
              <li>Upload Excel file (.xlsx) or CSV file (.csv)</li>
              <li>First row must contain these exact headers: <strong>Name</strong>, <strong>Email</strong>, <strong>Password</strong>, <strong>Phone</strong> (optional)</li>
              <li>Each row after the header = one crew member</li>
              <li>Download the template below to see the correct format</li>
            </ul>

            <button
              onClick={downloadTemplate}
              style={{
                marginTop: 16,
                background: 'var(--success)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--sans)'
              }}
            >
              Download Template File
            </button>
          </div>

          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <label style={{
              display: 'inline-block',
              background: 'var(--accent)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--sans)'
            }}>
              Select Excel or CSV File
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleExcelUpload}
                style={{ display: 'none' }}
              />
            </label>
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
              Click to browse for your Excel (.xlsx) or CSV file
            </p>
          </div>
        </div>
      )}

      {showAddForm && (
        <div style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          borderRadius: 18,
          padding: 'clamp(16px, 4vw, 30px)',
          marginBottom: 24
        }}>
          <h2 style={{
            fontFamily: 'var(--mono)',
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--text)',
            marginBottom: 20
          }}>
            Add New Crew Member
          </h2>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--muted)',
                marginBottom: 8
              }}>
                Full Name *
              </label>
              <input
                type="text"
                value={newCrew.full_name}
                onChange={e => setNewCrew({ ...newCrew, full_name: e.target.value })}
                placeholder="John Doe"
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
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--muted)',
                marginBottom: 8
              }}>
                Email *
              </label>
              <input
                type="email"
                value={newCrew.email}
                onChange={e => setNewCrew({ ...newCrew, email: e.target.value })}
                placeholder="crew@example.com"
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
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--muted)',
                marginBottom: 8
              }}>
                Phone
              </label>
              <input
                type="tel"
                value={newCrew.phone}
                onChange={e => setNewCrew({ ...newCrew, phone: e.target.value })}
                placeholder="+60123456789"
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
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--muted)',
                marginBottom: 8
              }}>
                Password *
              </label>
              <input
                type="password"
                value={newCrew.password}
                onChange={e => setNewCrew({ ...newCrew, password: e.target.value })}
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
              onClick={addCrewMember}
              disabled={loading}
              style={{
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
                width: '100%',
                minHeight: '48px'
              }}
            >
              {loading ? 'Adding...' : 'Add Crew Member'}
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden'
      }}>
        {loading && crew.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            Loading crew members...
          </div>
        ) : crew.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              No crew members yet. Add your first crew member to get started.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>NAME</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>DESIGNATION</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>EMAIL</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>PHONE</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>STATUS</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {crew.map(member => (
                  <tr key={member.id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: member.is_active ? 'transparent' : '#fffbeb'
                  }}>
                    <td style={{ padding: 12, fontWeight: 600, fontSize: 14 }}>{member.full_name}</td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        ...getDesignationColor(member.designation || 'Core Crew')
                      }}>
                        {member.designation || 'Core Crew'}
                      </span>
                    </td>
                    <td style={{ padding: 12, color: 'var(--muted)', fontSize: 13 }}>{member.email}</td>
                    <td style={{ padding: 12, color: 'var(--muted)', fontSize: 13 }}>{member.phone || '-'}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: member.is_active ? '#dcfce7' : '#fef3c7',
                        color: member.is_active ? '#166534' : '#92400e',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.is_active ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setEditingCrew(member)}
                          style={{
                            background: '#dbeafe',
                            border: '1px solid #1e40af',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#1e40af',
                            whiteSpace: 'nowrap',
                            minHeight: '36px'
                          }}
                        >
                          Edit
                        </button>
                        {!member.is_active ? (
                          <button
                            onClick={() => toggleCrewStatus(member.id, member.is_active)}
                            style={{
                              background: '#dcfce7',
                              border: '1px solid #166534',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: '#166534',
                              whiteSpace: 'nowrap',
                              minHeight: '36px'
                            }}
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleCrewStatus(member.id, member.is_active)}
                            style={{
                              background: 'none',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: '8px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: 'var(--text)',
                              whiteSpace: 'nowrap',
                              minHeight: '36px'
                            }}
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          onClick={() => deleteCrewMember(member.id)}
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#991b1b',
                            whiteSpace: 'nowrap',
                            minHeight: '36px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingCrew && (
        <CrewProfileEdit
          crew={editingCrew}
          onClose={() => setEditingCrew(null)}
          onUpdate={loadCrew}
          onToast={onToast}
        />
      )}
    </div>
  );
}
