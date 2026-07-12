"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ImageUp, Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/app/admin/products/actions";
import defaultCategories from "@/data/categories.json";
import { Product, Category, ProductPriceOption } from "@/lib/types";
import { calculateDiscount } from "@/lib/utils";

const categories = (defaultCategories as Category[]).filter((category) => category.id !== "all");
const customCategoryValue = "__custom";

type ProductFormProps = {
  product?: Product;
};

type EditableVariant = ProductPriceOption & {
  id: string;
};

export function ProductForm({ product }: ProductFormProps) {
  const existingCategory = categories.some((category) => category.id === product?.category);
  const [categoryMode, setCategoryMode] = useState(existingCategory || !product ? product?.category ?? "AI" : customCategoryValue);
  const [imagePath, setImagePath] = useState(product?.image ?? "/products/");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [variants, setVariants] = useState<EditableVariant[]>(
    (product?.priceOptions ?? []).map((option, index) => ({
      ...option,
      available: option.available !== false,
      id: `${option.label}-${index}`,
    })),
  );

  const discount = calculateDiscount(product?.oldPrice, product?.price);
  const serializedVariants = useMemo(
    () =>
      JSON.stringify(
        variants.map((variant) => ({
          label: variant.label,
          labelAr: variant.labelAr,
          duration: variant.duration,
          durationAr: variant.durationAr,
          price: variant.price,
          oldPrice: variant.oldPrice || undefined,
          available: variant.available !== false,
        })),
      ),
    [variants],
  );

  useEffect(() => {
    return () => {
      if (uploadPreview) {
        URL.revokeObjectURL(uploadPreview);
      }
    };
  }, [uploadPreview]);

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "1 Year",
        labelAr: "1 Year",
        duration: "1 Year",
        durationAr: "1 Year",
        price: product?.price ?? 0,
        oldPrice: undefined,
        available: true,
      },
    ]);
  }

  function updateVariant(index: number, patch: Partial<EditableVariant>) {
    setVariants((current) => current.map((variant, itemIndex) => (itemIndex === index ? { ...variant, ...patch } : variant)));
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveVariant(index: number, direction: -1 | 1) {
    setVariants((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={saveProductAction} encType="multipart/form-data" className="grid gap-5 rounded-md border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
      <input type="hidden" name="id" defaultValue={product?.id ?? ""} />
      <input type="hidden" name="priceOptions" value={serializedVariants} />

      <section className="rounded-md border border-white/10 bg-black/20 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-black text-white">Product basics</h2>
          <p className="mt-1 text-sm font-semibold text-white/55">Core catalog information shown on storefront cards and product pages.</p>
        </div>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField name="name" label="Product name" defaultValue={product?.name ?? ""} required />
        <AdminField name="nameAr" label="Arabic name" defaultValue={product?.nameAr ?? product?.name ?? ""} />
        <AdminField name="slug" label="Slug" defaultValue={product?.slug ?? ""} required />
        <label className="grid gap-2 text-sm font-bold text-white">
          Category
          <select
            name="category"
            value={categoryMode}
            onChange={(event) => setCategoryMode(event.target.value)}
            className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white outline-none"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name.en}</option>
            ))}
            <option value={customCategoryValue}>+ New category</option>
          </select>
        </label>
        {categoryMode === customCategoryValue ? (
          <>
            <AdminField name="customCategory" label="New category name" defaultValue={existingCategory ? "" : product?.category ?? ""} required />
            <AdminField name="customCategoryAr" label="New Arabic category name" defaultValue={existingCategory ? "" : product?.categoryAr ?? ""} />
          </>
        ) : null}
        <AdminField name="price" label="Base price" defaultValue={product ? String(product.price) : ""} type="number" required />
        <AdminField name="oldPrice" label="Old price for discount" defaultValue={product?.oldPrice ? String(product.oldPrice) : ""} type="number" />
        <AdminField name="duration" label="Base duration" defaultValue={product?.duration ?? ""} required />
        <AdminField name="durationAr" label="Arabic duration" defaultValue={product?.durationAr ?? product?.duration ?? ""} />
        <AdminField name="activationTypeEn" label="Activation type" defaultValue={product?.activationTypeEn ?? ""} required />
        <AdminField name="activationTypeAr" label="Arabic activation type" defaultValue={product?.activationTypeAr ?? ""} />
      </div>
      </section>

      <section className="grid gap-4 rounded-md border border-white/10 bg-black/25 p-4 lg:grid-cols-[170px_1fr]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-black">
          {uploadPreview || imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploadPreview ?? imagePath} alt="Product image preview" className="h-full w-full object-contain p-2" />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs font-bold text-white/45">
              No image selected
            </div>
          )}
        </div>
        <div className="grid content-start gap-3">
          <div>
            <h2 className="font-black text-white">Product image</h2>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Upload a PNG, JPG, WEBP, or AVIF under 4 MB, or keep/edit the hosted image path below.
            </p>
          </div>
          <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-tiger-ember/35 bg-tiger-ember px-4 text-sm font-black text-black transition-colors duration-150 hover:bg-tiger-gold">
            <ImageUp className="h-4 w-4" />
            Upload Image
            <input
              name="imageUpload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setUploadPreview(null);
                  return;
                }

                if (uploadPreview) {
                  URL.revokeObjectURL(uploadPreview);
                }
                setUploadPreview(URL.createObjectURL(file));
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-white">
            Image path or URL
            <input
              name="image"
              value={imagePath}
              onChange={(event) => {
                setImagePath(event.target.value);
                if (uploadPreview) {
                  URL.revokeObjectURL(uploadPreview);
                  setUploadPreview(null);
                }
              }}
              placeholder="/products/uploads/example.webp"
              className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white outline-none"
            />
          </label>
        </div>
      </section>

      <TextArea name="shortDescriptionEn" label="Short description" defaultValue={product?.shortDescriptionEn ?? ""} />
      <TextArea name="shortDescriptionAr" label="Arabic short description" defaultValue={product?.shortDescriptionAr ?? ""} />
      <TextArea name="featuresEn" label="Features - one per line" defaultValue={product?.featuresEn.join("\n") ?? ""} />
      <TextArea name="featuresAr" label="Arabic features - one per line" defaultValue={product?.featuresAr.join("\n") ?? ""} />

      <section className="grid gap-3 rounded-md border border-white/10 bg-black/25 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-white">Variants and Durations</h2>
            <p className="mt-1 text-sm text-white/55">Add multiple prices such as 1 Year, 2 Years, or 3 Years.</p>
          </div>
          <button type="button" onClick={addVariant} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-tiger-ember px-3 text-sm font-black text-black">
            <Plus className="h-4 w-4" />
            Add Variant
          </button>
        </div>

        {variants.length ? (
          <div className="grid gap-3">
            {variants.map((variant, index) => (
              <div key={variant.id} className="grid gap-3 rounded-xl border border-white/10 bg-black/35 p-3 lg:grid-cols-[1fr_1fr_120px_120px_auto]">
                <InlineField label="Variant name" value={variant.label} onChange={(value) => updateVariant(index, { label: value, labelAr: value })} />
                <InlineField label="Duration" value={variant.duration} onChange={(value) => updateVariant(index, { duration: value, durationAr: value })} />
                <InlineField label="Price" type="number" value={String(variant.price || "")} onChange={(value) => updateVariant(index, { price: Number(value) })} />
                <InlineField label="Old price" type="number" value={variant.oldPrice ? String(variant.oldPrice) : ""} onChange={(value) => updateVariant(index, { oldPrice: value ? Number(value) : undefined })} />
                <div className="flex items-end gap-1">
                  <button type="button" onClick={() => moveVariant(index, -1)} className="h-10 w-10 rounded-lg border border-white/10 text-white/75" aria-label="Move up">
                    <ArrowUp className="mx-auto h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => moveVariant(index, 1)} className="h-10 w-10 rounded-lg border border-white/10 text-white/75" aria-label="Move down">
                    <ArrowDown className="mx-auto h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => updateVariant(index, { available: variant.available === false ? true : false })} className="h-10 rounded-lg border border-white/10 px-3 text-xs font-bold text-white/75">
                    {variant.available === false ? "Off" : "On"}
                  </button>
                  <button type="button" onClick={() => removeVariant(index)} className="h-10 w-10 rounded-lg border border-white/10 text-white/75" aria-label="Remove">
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white/55">
            No variants yet. The base product price will be used.
          </p>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 p-3 text-sm font-bold text-white">
          <input type="checkbox" name="available" defaultChecked={product?.available ?? true} />
          Available
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 p-3 text-sm font-bold text-white">
          <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} />
          Featured
        </label>
        <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-sm font-bold text-white">
          Current discount: <span className="text-tiger-gold">{discount ? `${discount}%` : "None"}</span>
        </div>
      </div>

      <button type="submit" className="min-h-12 rounded-xl bg-tiger-ember px-5 font-black text-black transition-colors hover:bg-tiger-gold">
        Save Product
      </button>
    </form>
  );
}

function AdminField({
  name,
  label,
  defaultValue,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-white">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white outline-none focus:border-tiger-ember"
      />
    </label>
  );
}

function InlineField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-white/70">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-tiger-ember"
      />
    </label>
  );
}

function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-white">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        className="min-h-28 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-tiger-ember"
      />
    </label>
  );
}
