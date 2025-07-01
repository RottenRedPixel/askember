import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const emptyPrompt = {
  name: '',
  description: '',
  category: '',
  subcategory: '',
  prompt_key: '',
  system_prompt: '',
  user_prompt_template: '',
  is_active: true,
};

export default function PromptManagement() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [form, setForm] = useState(emptyPrompt);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch all prompts
  const fetchPrompts = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) setError(error.message);
    setPrompts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Open modal for add/edit
  const openModal = (prompt = null) => {
    setEditingPrompt(prompt);
    setForm(prompt ? { ...prompt } : emptyPrompt);
    setShowModal(true);
  };

  // Save (add or update) prompt
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    let result;
    if (editingPrompt) {
      // Update
      result = await supabase
        .from('prompts')
        .update({ ...form })
        .eq('id', editingPrompt.id)
        .select();
    } else {
      // Insert
      result = await supabase
        .from('prompts')
        .insert([{ ...form }])
        .select();
    }
    if (result.error) setError(result.error.message);
    setShowModal(false);
    setSaving(false);
    fetchPrompts();
  };

  // Delete prompt
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prompt?')) return;
    setDeletingId(id);
    await supabase.from('prompts').delete().eq('id', id);
    setDeletingId(null);
    fetchPrompts();
  };

  // Toggle active
  const handleToggleActive = async (prompt) => {
    await supabase
      .from('prompts')
      .update({ is_active: !prompt.is_active })
      .eq('id', prompt.id);
    fetchPrompts();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt Management</CardTitle>
          <Button onClick={() => openModal()} className="ml-4">Add Prompt</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2">Name</th>
                    <th className="p-2">Key</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Active</th>
                    <th className="p-2">Updated</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2">{p.prompt_key}</td>
                      <td className="p-2">{p.category}</td>
                      <td className="p-2">
                        <Badge className={p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(p)}>
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                      <td className="p-2">{new Date(p.updated_at).toLocaleString()}</td>
                      <td className="p-2 space-x-2">
                        <Button size="sm" onClick={() => openModal(p)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>
                          {deletingId === p.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add Prompt'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Input name="name" label="Name" placeholder="Prompt Name" value={form.name} onChange={handleChange} required />
            <Input name="prompt_key" label="Prompt Key" placeholder="Unique Key" value={form.prompt_key} onChange={handleChange} required />
            <Input name="category" label="Category" placeholder="Category" value={form.category} onChange={handleChange} required />
            <Input name="subcategory" label="Subcategory" placeholder="Subcategory" value={form.subcategory} onChange={handleChange} />
            <Textarea name="description" label="Description" placeholder="Description" value={form.description} onChange={handleChange} />
            <Textarea name="system_prompt" label="System Prompt" placeholder="System Prompt" value={form.system_prompt} onChange={handleChange} required />
            <Textarea name="user_prompt_template" label="User Prompt Template" placeholder="User Prompt Template" value={form.user_prompt_template} onChange={handleChange} />
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              <span>Active</span>
            </label>
            <div className="flex space-x-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
            {error && <div className="text-red-600">{error}</div>}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 