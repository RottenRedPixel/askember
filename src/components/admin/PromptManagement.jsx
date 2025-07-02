import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

      {/* Add/Edit Modal - Enhanced Version */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white dark:bg-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Prompt Name *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter a descriptive name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prompt_key" className="text-sm font-medium text-gray-700">
                    Prompt Key *
                  </Label>
                  <Input
                    id="prompt_key"
                    name="prompt_key"
                    placeholder="unique_identifier_key"
                    value={form.prompt_key}
                    onChange={handleChange}
                    required
                    className="h-10"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Category *
                  </Label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="e.g. story_cuts, image_analysis"
                    value={form.category}
                    onChange={handleChange}
                    required
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subcategory" className="text-sm font-medium text-gray-700">
                    Subcategory
                  </Label>
                  <Input
                    id="subcategory"
                    name="subcategory"
                    placeholder="e.g. styles, generators"
                    value={form.subcategory}
                    onChange={handleChange}
                    className="h-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of what this prompt does..."
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            <Separator />

            {/* Prompt Content Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Prompt Content</h3>
              
              <div className="space-y-2">
                <Label htmlFor="system_prompt" className="text-sm font-medium text-gray-700">
                  System Prompt * 
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (Instructions that define the AI's role and behavior)
                  </span>
                </Label>
                <Textarea
                  id="system_prompt"
                  name="system_prompt"
                  placeholder="You are an expert assistant that..."
                  value={form.system_prompt}
                  onChange={handleChange}
                  required
                  rows={8}
                  className="resize-y min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Define the AI's role, personality, and core instructions. This sets the context for all interactions.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="user_prompt_template" className="text-sm font-medium text-gray-700">
                  User Prompt Template
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (Template for user input - optional)
                  </span>
                </Label>
                <Textarea
                  id="user_prompt_template"
                  name="user_prompt_template"
                  placeholder="Create a story about {topic} that includes..."
                  value={form.user_prompt_template}
                  onChange={handleChange}
                  rows={6}
                  className="resize-y min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Template for formatting user requests. Use {'{}'} placeholders for dynamic content.
                </p>
              </div>
            </div>

            <Separator />

            {/* Settings Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Settings</h3>
              
              <div className="flex items-center space-x-3">
                <input
                  id="is_active"
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (Enable this prompt for use in the application)
                  </span>
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  editingPrompt ? 'Update Prompt' : 'Create Prompt'
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 