'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, User, MenuItem, Category } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import { useState } from 'react';

const emptyItem = {
  name: '',
  description: '',
  price: '',
  emoji: '🍽️',
  categoryId: '',
  prepTimeMinutes: '15',
  available: true,
  isSpecial: false,
};

export default function AdminPanel() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [configForm, setConfigForm] = useState<Record<string, number>>({});
  const [itemForm, setItemForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'STAFF' | 'ADMIN'>('STAFF');

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.admin.analytics(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.admin.users(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: configData } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: async () => {
      const res = await api.admin.loyaltyConfig();
      return (res as { config: Record<string, number> }).config;
    },
    enabled: user?.role === 'ADMIN',
  });

  const { data: menuData } = useQuery({
    queryKey: ['admin-menu'],
    queryFn: () => api.menu.items({ available: 'false' }),
    enabled: user?.role === 'ADMIN',
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.menu.categories(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: invitesData } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: () => api.admin.invites(),
    enabled: user?.role === 'ADMIN',
  });

  const updateRole = async (u: User, role: string) => {
    try {
      await api.admin.updateUser({ userId: u.id, role });
      toast('User role updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await api.admin.updateUser({ userId: u.id, isActive: !u.isActive });
      toast(u.isActive ? 'User deactivated' : 'User activated', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const saveConfig = async () => {
    try {
      await api.admin.updateLoyaltyConfig(configForm);
      toast('Loyalty config saved', 'success');
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const saveMenuItem = async () => {
    try {
      const payload = {
        name: itemForm.name,
        description: itemForm.description || undefined,
        price: parseFloat(itemForm.price),
        emoji: itemForm.emoji,
        categoryId: itemForm.categoryId || undefined,
        prepTimeMinutes: parseInt(itemForm.prepTimeMinutes),
        available: itemForm.available,
        isSpecial: itemForm.isSpecial,
      };

      if (editingId) {
        await api.menu.updateItem(editingId, payload);
        toast('Menu item updated', 'success');
      } else {
        await api.menu.createItem(payload);
        toast('Menu item created', 'success');
      }

      setItemForm(emptyItem);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const editItem = (item: MenuItem) => {
    setEditingId(item.id);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      emoji: item.emoji || '🍽️',
      categoryId: item.categoryId || item.category?.id || '',
      prepTimeMinutes: String(item.prepTimeMinutes),
      available: item.available,
      isSpecial: item.isSpecial,
    });
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await api.menu.deleteItem(id);
      toast('Item deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-menu'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const createInvite = async () => {
    try {
      const { invite } = await api.admin.createInvite({ role: inviteRole });
      toast(`Invite code: ${invite.code}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const exportCsv = async () => {
    try {
      await api.admin.exportCsv();
      toast('Export downloaded', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="py-16 text-center">
        <p>Admin access required</p>
        <Link href="/login" className="text-orange-600 hover:underline">Login</Link>
      </div>
    );
  }

  const a = analytics?.analytics;
  const categories = categoriesData?.categories || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <button
          onClick={exportCsv}
          className="rounded-lg border border-orange-200 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50"
        >
          Export Orders CSV
        </button>
      </div>

      {a && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Orders', value: a.totalOrders },
            { label: 'Today Orders', value: a.todayOrders },
            { label: 'Total Revenue', value: formatCurrency(a.totalRevenue) },
            { label: 'Users', value: a.userCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-orange-100 bg-white p-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-orange-600">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {a?.popularItems && (
        <section className="rounded-xl border border-orange-100 bg-white p-4">
          <h2 className="mb-3 font-semibold">Popular Items</h2>
          <div className="space-y-2">
            {a.popularItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.emoji} {item.name}</span>
                <span className="text-slate-500">{item.quantitySold} sold</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-orange-100 bg-white p-4">
        <h2 className="mb-3 font-semibold">Menu Management</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            placeholder="Name"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="Price"
            type="number"
            step="0.01"
            value={itemForm.price}
            onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            placeholder="Emoji"
            value={itemForm.emoji}
            onChange={(e) => setItemForm({ ...itemForm, emoji: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          />
          <select
            value={itemForm.categoryId}
            onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">Category</option>
            {categories.map((c: Category) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            placeholder="Description"
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            className="rounded border px-3 py-2 text-sm sm:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={itemForm.available}
              onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
            />
            Available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={itemForm.isSpecial}
              onChange={(e) => setItemForm({ ...itemForm, isSpecial: e.target.checked })}
            />
            Special
          </label>
        </div>
        <div className="mb-4 flex gap-2">
          <button onClick={saveMenuItem} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">
            {editingId ? 'Update Item' : 'Add Item'}
          </button>
          {editingId && (
            <button
              onClick={() => { setEditingId(null); setItemForm(emptyItem); }}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Item</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuData?.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="py-2">{item.emoji} {item.name}</td>
                  <td className="py-2">{formatCurrency(Number(item.price))}</td>
                  <td className="py-2">{item.available ? 'Available' : 'Unavailable'}</td>
                  <td className="py-2">
                    <button onClick={() => editItem(item)} className="mr-2 text-orange-600 hover:underline">Edit</button>
                    <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-orange-100 bg-white p-4">
        <h2 className="mb-3 font-semibold">Staff Invite Codes</h2>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'STAFF' | 'ADMIN')}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button onClick={createInvite} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">
            Generate Code
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Code</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Expires</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invitesData?.invites.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50">
                  <td className="py-2 font-mono font-bold">{inv.code}</td>
                  <td className="py-2">{inv.role}</td>
                  <td className="py-2">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  <td className="py-2">{inv.usedBy ? 'Used' : 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-orange-100 bg-white p-4">
        <h2 className="mb-3 font-semibold">User Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Points</th>
                <th className="pb-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {usersData?.users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-2">{u.fullName}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u, e.target.value)}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="py-2">{u.loyaltyPoints}</td>
                  <td className="py-2">
                    <button
                      onClick={() => toggleActive(u)}
                      className={`rounded px-2 py-1 text-xs ${u.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {u.isActive !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {configData && (
        <section className="rounded-xl border border-orange-100 bg-white p-4">
          <h2 className="mb-3 font-semibold">Loyalty Program Rules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {['pointsPerDollar', 'redeemPointsPerUnit', 'redeemValueCents', 'cancelWindowMinutes', 'maxOrderItems'].map(
              (key) => (
                <div key={key}>
                  <label className="text-xs text-slate-500">{key}</label>
                  <input
                    type="number"
                    defaultValue={configData[key]}
                    onChange={(e) => setConfigForm({ ...configForm, [key]: parseInt(e.target.value) })}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              )
            )}
          </div>
          <button onClick={saveConfig} className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700">
            Save Config
          </button>
        </section>
      )}
    </div>
  );
}
