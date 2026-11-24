'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  ImageIcon,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VariantDraft {
  id?: string;
  label: string;
  price: string;
}

interface MenuVariantRow {
  id: string;
  label: string;
  price: number;
  sort_order: number;
}

interface MenuItemRecord {
  id: string;
  name: string;
  category: string;
  description: string | null;
  kitchen_station: string;
  base_price: number;
  image_url: string | null;
  is_deal: boolean;
  is_available: boolean;
  item_variants: MenuVariantRow[];
}

// Client-side image compression before uploading to Supabase Storage
async function compressImageFile(file: File, maxWidth = 800, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
        'image/webp',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state (null = creating a new dish/deal)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Custom text form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Karahi & Handi');
  const [kitchenStation, setKitchenStation] = useState('main');
  const [basePrice, setBasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [isDeal, setIsDeal] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        category,
        description,
        kitchen_station,
        base_price,
        image_url,
        is_deal,
        is_available,
        item_variants (
          id,
          label,
          price,
          sort_order
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const normalized = (data as unknown as MenuItemRecord[]).map((row) => ({
        ...row,
        item_variants: [...(row.item_variants || [])].sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        ),
      }));
      setItems(normalized);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const resetForm = () => {
    setEditingItemId(null);
    setExistingImageUrl(null);
    setName('');
    setCategory('Karahi & Handi');
    setKitchenStation('main');
    setBasePrice('');
    setDescription('');
    setIsDeal(false);
    setImageFile(null);
    setImagePreview(null);
    setVariants([]);
  };

  const startEditingItem = (item: MenuItemRecord) => {
    setEditingItemId(item.id);
    setExistingImageUrl(item.image_url);
    setName(item.name);
    setCategory(item.category || 'General');
    setKitchenStation(item.kitchen_station || 'main');
    setBasePrice(String(item.base_price ?? 0));
    setDescription(item.description || '');
    setIsDeal(Boolean(item.is_deal));
    setImageFile(null);
    setImagePreview(item.image_url);
    setVariants(
      (item.item_variants || []).map((v) => ({
        id: v.id,
        label: v.label,
        price: String(v.price),
      }))
    );
    setFeedback(`Editing "${item.name}" — update any custom fields or variants and save.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addVariantRow = () => {
    setVariants((prev) => [...prev, { label: '', price: '' }]);
  };

  const updateVariantRow = (index: number, field: 'label' | 'price', value: string) => {
    setVariants((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, [field]: value } : v))
    );
  };

  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setFeedback(null);

    try {
      let resolvedImageUrl: string | null = editingItemId ? existingImageUrl : null;

      if (imageFile) {
        const compressedBlob = await compressImageFile(imageFile);
        const fileName = `${Date.now()}-${name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(fileName, compressedBlob, { contentType: 'image/webp' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);

        resolvedImageUrl = publicUrlData.publicUrl;
      }

      const validVariants = variants.filter(
        (v) => v.label.trim() !== '' && v.price !== '' && !Number.isNaN(Number(v.price))
      );

      const resolvedBasePrice =
        basePrice !== ''
          ? Number(basePrice)
          : validVariants.length > 0
          ? Number(validVariants[0].price)
          : 0;

      const cleanStation = kitchenStation.trim() || 'main';
      const cleanCategory = category.trim() || 'General';

      let targetItemId = editingItemId;

      if (editingItemId) {
        const { error: updateError } = await supabase
          .from('menu_items')
          .update({
            name: name.trim(),
            category: cleanCategory,
            description: description.trim() || null,
            kitchen_station: cleanStation,
            base_price: resolvedBasePrice,
            image_url: resolvedImageUrl,
            is_deal: isDeal,
          })
          .eq('id', editingItemId);

        if (updateError) throw updateError;

        const { error: delVarError } = await supabase
          .from('item_variants')
          .delete()
          .eq('menu_item_id', editingItemId);

        if (delVarError) throw delVarError;
      } else {
        const { data: insertedItem, error: itemError } = await supabase
          .from('menu_items')
          .insert({
            name: name.trim(),
            category: cleanCategory,
            description: description.trim() || null,
            kitchen_station: cleanStation,
            base_price: resolvedBasePrice,
            image_url: resolvedImageUrl,
            is_deal: isDeal,
            is_available: true,
          })
          .select('id')
          .single();

        if (itemError) throw itemError;
        targetItemId = insertedItem.id;
      }

      if (targetItemId && validVariants.length > 0) {
        const variantRows = validVariants.map((v, idx) => ({
          menu_item_id: targetItemId,
          label: v.label.trim(),
          price: Number(v.price),
          is_default: idx === 0,
          sort_order: idx + 1,
        }));

        const { error: varError } = await supabase
          .from('item_variants')
          .insert(variantRows);

        if (varError) throw varError;
      }

      const wasEditing = Boolean(editingItemId);
      resetForm();
      setFeedback(
        wasEditing
          ? 'Updated item is now live on the POS & Customer Storefront (/order)!'
          : 'New item saved & live on the POS & Customer Storefront (/order)!'
      );
      await fetchCatalog();
    } catch (err: any) {
      setFeedback(`Error: ${err.message || 'Failed to save menu item'}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItemRecord) => {
    await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);
    fetchCatalog();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this menu item and its variants?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    if (editingItemId === id) {
      resetForm();
    }
    fetchCatalog();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Menu, Variants &amp; Deals Manager
            </h1>
            <p className="text-xs text-slate-500">
              Enter custom names, categories, stations, prices &amp; variants — changes sync live to POS &amp; /order
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {items.length} Live Products
        </span>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {feedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Form: Add / Edit Product / Deal + Variants */}
        <form
          onSubmit={handleSaveItem}
          className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 h-fit"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              {editingItemId ? 'Edit Menu Item or Deal' : 'Add New Menu Item or Deal'}
            </h2>
            {editingItemId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Product Image (Auto-Compressed WebP)
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 hover:border-amber-500 transition">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-32 rounded-lg object-cover shadow-xs"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <Upload className="h-6 w-6 mb-1 text-slate-400" />
                  <span className="text-xs font-semibold">Click to select food photo</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, or WebP</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Item / Deal Name *</label>
            <input
              required
              type="text"
              placeholder="Type any custom item or deal name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">Category (Custom Text)</label>
              <input
                type="text"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Type any category..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
              <datalist id="category-suggestions">
                <option value="Karahi & Handi" />
                <option value="BBQ & Grill" />
                <option value="Fast Food" />
                <option value="Deals" />
                <option value="Breads & Sides" />
                <option value="Beverages" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Kitchen Station (Custom Text)</label>
              <input
                type="text"
                list="station-suggestions"
                value={kitchenStation}
                onChange={(e) => setKitchenStation(e.target.value)}
                placeholder="Type any station..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
              <datalist id="station-suggestions">
                <option value="main" />
                <option value="grill" />
                <option value="fryer" />
                <option value="drinks" />
                <option value="tandoor" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Base Price (Rs.) *
              </label>
              <input
                required={variants.length === 0}
                type="number"
                min={0}
                placeholder="1650"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={isDeal}
                onChange={(e) => setIsDeal(e.target.checked)}
                className="rounded border-amber-400"
              />
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Mark as Combo Deal</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              Description / Deal Contents (Custom Text)
            </label>
            <textarea
              rows={2}
              placeholder="Write custom dish details, ingredients, or deal items..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Variants Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-slate-800">
                  Size / Portion Variants
                </div>
                <div className="text-[10px] text-slate-500">
                  Enter any custom variant label &amp; price (e.g. Half, Full, 1kg, Family)
                </div>
              </div>
              <button
                type="button"
                onClick={addVariantRow}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
              >
                <Plus className="h-3 w-3" />
                <span>Add Variant</span>
              </button>
            </div>

            {variants.map((v, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Custom variant label"
                  value={v.label}
                  onChange={(e) => updateVariantRow(idx, 'label', e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Price"
                  value={v.price}
                  onChange={(e) => updateVariantRow(idx, 'price', e.target.value)}
                  className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeVariantRow(idx)}
                  className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {saving
              ? editingItemId
                ? 'Updating Item...'
                : 'Uploading & Saving...'
              : editingItemId
              ? 'Update Menu Item & Variants'
              : 'Save Menu Item'}
          </button>
        </form>

        {/* Right List: Live Catalog */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              Loading menu catalog...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No items in Supabase yet. Use the form on the left to add your first dish or deal!
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-3.5 shadow-2xs transition ${
                    editingItemId === item.id
                      ? 'border-amber-500 ring-2 ring-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex gap-3">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="truncate text-sm font-bold text-slate-900">
                          {item.name}
                        </h3>
                        {item.is_deal && (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            DEAL
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {item.category} • {item.kitchen_station}
                      </p>
                      <p className="mt-1 text-xs font-extrabold text-slate-900">
                        Base: Rs. {Number(item.base_price).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Variants Pills */}
                  {item.item_variants && item.item_variants.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
                      {item.item_variants.map((v) => (
                        <span
                          key={v.id}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          {v.label}: Rs. {Number(v.price).toLocaleString()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Controls */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(item)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        item.is_available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {item.is_available ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> In Stock
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Out of Stock
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditingItem(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-300"
                        title="Edit Item & Variants"
                      >
                        <Pencil className="h-3 w-3 text-amber-700" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}