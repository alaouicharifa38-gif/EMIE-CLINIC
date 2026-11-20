import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';
import type {
  AppointmentRecord,
  ClinicService,
  ClientRecord,
  Language,
  StaffMember,
  UserRole,
} from '../../../shared/types.ts';
import { useLanguage } from '../../i18n/LanguageContext.tsx';

// =============================================================================
// CLIENTS MODULE
// =============================================================================

export function ClientsModule({
  airtableConfigured,
  clients,
  appointments,
  userRole,
  onRefresh,
  onOpenAppointment,
}: {
  airtableConfigured: boolean;
  clients: ClientRecord[];
  appointments: AppointmentRecord[];
  userRole: UserRole;
  onRefresh: () => Promise<void>;
  onOpenAppointment: (appt: AppointmentRecord) => void;
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<'ALL' | Language>('ALL');
  const [selected, setSelected] = useState<ClientRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLang, setEditLang] = useState<Language>('fr');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openProfile = (c: ClientRecord) => {
    setSelected(c);
    setEditName(c.fullName);
    setEditPhone(c.phone);
    setEditEmail(c.email);
    setEditLang(c.preferredLanguage);
    setEditNotes(c.internalNotes);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (langFilter !== 'ALL' && c.preferredLanguage !== langFilter) return false;
      if (q) {
        const hay = `${c.clientId} ${c.fullName} ${c.phone} ${c.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [clients, search, langFilter]);

  const clientAppointments = useMemo(() => {
    if (!selected) return [];
    return appointments.filter((a) => a.clientId === selected.id);
  }, [selected, appointments]);

  const saveClient = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editName,
          phone: editPhone,
          email: editEmail,
          preferredLanguage: editLang,
          internalNotes: editNotes,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { client: ClientRecord };
        setSelected(data.client);
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!airtableConfigured) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEADE] p-8 text-sm text-[#6B6668]">
        {t.admin.common.awaitingConfigDesc}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-[#EDEADE] p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#6B6668] absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.admin.common.search}
            className="w-full ps-9 pe-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
          />
        </div>
        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value as 'ALL' | Language)}
          className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm bg-white"
        >
          <option value="ALL">Language: {t.admin.common.all}</option>
          <option value="fr">FR</option>
          <option value="en">EN</option>
          <option value="ar">AR</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#EDEADE] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B6668]">
            {t.admin.common.noRecords}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-[#F9F9F9] border-b border-[#EDEADE] text-xs text-[#6B6668]">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Client ID</th>
                  <th className="px-4 py-3 text-start font-medium">Name</th>
                  <th className="px-4 py-3 text-start font-medium">Phone</th>
                  <th className="px-4 py-3 text-start font-medium">Email</th>
                  <th className="px-4 py-3 text-start font-medium">Lang</th>
                  <th className="px-4 py-3 text-end font-medium">{t.admin.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEADE]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F6F2E9]/45">
                    <td className="px-4 py-3 font-mono-tabular text-xs text-[#6B6668]">
                      {c.clientId}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#444343]">{c.fullName}</td>
                    <td className="px-4 py-3 tabular-nums text-[#444343]" dir="ltr">
                      {c.phone}
                    </td>
                    <td className="px-4 py-3 text-[#6B6668]" dir="ltr">
                      {c.email || '—'}
                    </td>
                    <td className="px-4 py-3 uppercase text-xs text-[#6B6668]">
                      {c.preferredLanguage}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => openProfile(c)}
                        className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] hover:border-[#5B9D3F] cursor-pointer"
                      >
                        {t.admin.common.details}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#444343]/45">
          <div className="w-full max-w-xl h-full bg-white border-s border-[#EDEADE] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-[#EDEADE]">
              <div>
                <div className="font-mono-tabular text-xs text-[#5B9D3F]">
                  {selected.clientId}
                </div>
                <h3 className="font-display text-xl font-medium text-[#444343]">
                  {selected.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg text-[#6B6668] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userRole !== 'Staff' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
                  placeholder="Full Name"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="tel"
                    dir="ltr"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm tabular-nums"
                  />
                  <input
                    type="email"
                    dir="ltr"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
                  />
                </div>
                <select
                  value={editLang}
                  onChange={(e) => setEditLang(e.target.value as Language)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm bg-white"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={t.admin.common.internalNotes}
                  className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveClient}
                  className="w-full py-2.5 rounded-lg bg-[#444343] text-white text-sm font-medium hover:bg-[#5B9D3F] cursor-pointer"
                >
                  {t.admin.common.save}
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-[#EDEADE] space-y-3">
              <h4 className="text-sm font-medium text-[#444343]">
                {t.admin.nav.appointments} ({clientAppointments.length})
              </h4>
              {clientAppointments.length === 0 ? (
                <p className="text-xs text-[#6B6668]">{t.admin.common.noRecords}</p>
              ) : (
                <div className="space-y-2">
                  {clientAppointments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        onOpenAppointment(a);
                      }}
                      className="w-full text-start p-3 rounded-lg border border-[#EDEADE] hover:border-[#5B9D3F] flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <div className="font-medium text-[#444343]">{a.serviceName}</div>
                        <div className="font-mono-tabular text-[#6B6668]">
                          {a.preferredDate} · {a.preferredTime}
                        </div>
                      </div>
                      <span className="font-medium text-[#444343]">
                        {t.statuses[a.status]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SERVICES MODULE (Strictly the 5 official EMIE CLINIC services)
// =============================================================================

export function ServicesModule({
  airtableConfigured,
  fromAirtable,
  services,
  userRole,
  onRefresh,
}: {
  airtableConfigured: boolean;
  fromAirtable: boolean;
  services: ClinicService[];
  userRole: UserRole;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(45);
  const [saving, setSaving] = useState(false);

  const ordered = [...services].sort((a, b) => a.displayOrder - b.displayOrder);

  const seedServices = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/services/seed', { method: 'POST' });
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: ClinicService) => {
    if (!fromAirtable) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !service.active }),
      });
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const moveOrder = async (index: number, delta: -1 | 1) => {
    if (!fromAirtable) return;
    const target = ordered[index + delta];
    const current = ordered[index];
    if (!target || !current) return;
    setSaving(true);
    try {
      await Promise.all([
        fetch(`/api/admin/services/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: target.displayOrder }),
        }),
        fetch(`/api/admin/services/${target.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: current.displayOrder }),
        }),
      ]);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDesc,
          durationMinutes: editDuration,
        }),
      });
      setEditingId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {airtableConfigured && !fromAirtable && userRole !== 'Staff' && (
        <div className="bg-[#F6F2E9] rounded-xl border border-[#EDEADE] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#444343]">
            The Airtable <strong>Services</strong> table is currently empty. Seed the 5 official EMIE CLINIC services now.
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={seedServices}
            className="px-4 py-2 rounded-lg bg-[#5B9D3F] text-white text-xs font-medium cursor-pointer"
          >
            Initialize 5 Official Services
          </button>
        </div>
      )}

      <div className="space-y-3">
        {ordered.map((service, idx) => (
          <div
            key={service.id}
            className="bg-white rounded-xl border border-[#EDEADE] p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-xs text-[#5B9D3F]">
                  0{service.displayOrder}
                </span>
                <h3 className="font-display text-lg font-medium text-[#444343]">
                  {service.name}
                </h3>
                <span className="text-xs text-[#6B6668] tabular-nums">
                  · {service.durationMinutes} min
                </span>
                <span
                  className={`text-xs font-medium ${
                    service.active ? 'text-[#5B9D3F]' : 'text-[#6B6668]'
                  }`}
                >
                  · {service.active ? t.admin.common.active : t.admin.common.inactive}
                </span>
              </div>

              {userRole !== 'Staff' && fromAirtable && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || idx === 0}
                    onClick={() => moveOrder(idx, -1)}
                    className="p-1.5 rounded-lg border border-[#EDEADE] disabled:opacity-40 cursor-pointer"
                    aria-label="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={saving || idx === ordered.length - 1}
                    onClick={() => moveOrder(idx, 1)}
                    className="p-1.5 rounded-lg border border-[#EDEADE] disabled:opacity-40 cursor-pointer"
                    aria-label="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(service.id);
                      setEditDesc(service.description);
                      setEditDuration(service.durationMinutes);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => toggleActive(service)}
                    className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] cursor-pointer"
                  >
                    {service.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}
            </div>

            {editingId === service.id ? (
              <div className="pt-2 space-y-3">
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
                />
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[#6B6668]">
                    Duration (min):
                    <input
                      type="number"
                      min={15}
                      max={240}
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      className="ms-2 w-20 px-2 py-1 rounded border border-[#EDEADE] tabular-nums"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEdit(service.id)}
                    className="px-4 py-1.5 rounded-lg bg-[#5B9D3F] text-white text-xs font-medium cursor-pointer"
                  >
                    {t.admin.common.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs cursor-pointer"
                  >
                    {t.admin.common.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#6B6668] leading-relaxed">{service.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// STAFF MODULE (Never invents fake staff; starts empty)
// =============================================================================

export function StaffModule({
  airtableConfigured,
  staff,
  services,
  appointments,
  userRole,
  onRefresh,
}: {
  airtableConfigured: boolean;
  staff: StaffMember[];
  services: ClinicService[];
  appointments: AppointmentRecord[];
  userRole: UserRole;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [availability, setAvailability] = useState('');
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleService = (id: string) => {
    setAssignedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          role,
          phone,
          email,
          availability,
          assignedServiceIds,
        }),
      });
      if (res.ok) {
        setFullName('');
        setRole('');
        setPhone('');
        setEmail('');
        setAvailability('');
        setAssignedServiceIds([]);
        setShowAdd(false);
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStaffActive = async (member: StaffMember) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !member.active }),
      });
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  if (!airtableConfigured) {
    return (
      <div className="bg-white rounded-xl border border-[#EDEADE] p-8 text-sm text-[#6B6668]">
        {t.admin.common.awaitingConfigDesc}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {userRole !== 'Staff' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#444343] text-white text-xs font-medium hover:bg-[#5B9D3F] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-[#EDEADE] p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
            />
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role / Specialty"
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
            />
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
            />
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
            />
          </div>

          <input
            type="text"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="Availability schedule (e.g. Mon–Fri 09:00–18:00)"
            className="w-full px-3 py-2 rounded-lg border border-[#EDEADE] text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                  assignedServiceIds.includes(s.id)
                    ? 'bg-[#444343] text-white border-[#444343]'
                    : 'bg-white text-[#444343] border-[#EDEADE]'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg border border-[#EDEADE] text-xs cursor-pointer"
            >
              {t.admin.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#5B9D3F] text-white text-xs font-medium cursor-pointer"
            >
              {t.admin.common.save}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-[#EDEADE] overflow-hidden">
        {staff.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B6668]">
            No staff members added yet. Use “Add Staff Member” to create real practitioner profiles in Airtable.
          </div>
        ) : (
          <div className="divide-y divide-[#EDEADE]">
            {staff.map((m) => {
              const assignedCount = appointments.filter(
                (a) => a.assignedStaffId === m.id,
              ).length;
              return (
                <div
                  key={m.id}
                  className="p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium text-[#444343]">{m.fullName}</span>
                      <span className="text-xs text-[#6B6668]">· {m.role}</span>
                      <span
                        className={`text-xs font-medium ${
                          m.active ? 'text-[#5B9D3F]' : 'text-[#6B6668]'
                        }`}
                      >
                        · {m.active ? t.admin.common.active : t.admin.common.inactive}
                      </span>
                    </div>
                    <div className="text-xs text-[#6B6668] tabular-nums">
                      {m.phone || '—'} · {m.email || '—'} · {assignedCount} assigned appointments
                    </div>
                    {m.availability && (
                      <div className="text-xs text-[#6B6668]">{m.availability}</div>
                    )}
                  </div>

                  {userRole !== 'Staff' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => toggleStaffActive(m)}
                      className="px-3 py-1.5 rounded-lg border border-[#EDEADE] text-xs font-medium text-[#444343] cursor-pointer"
                    >
                      {m.active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
