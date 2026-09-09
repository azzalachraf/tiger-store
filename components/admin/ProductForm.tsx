"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImageUp, Plus, Save, Trash2 } from "lucide-react";
import { saveProductAction } from "@/app/admin/products/actions";
import type {
  Product,
  Category,
  ProductPriceOption,
  ProductDetails,
} from "@/lib/types";
import { ActionForm } from "./ActionForm";
import { parseProductOptions, parseProductExtra } from "./product-form-data";

const detailFields = [
  ["activationTime", "Activation time"],
  ["activationMethod", "Activation method"],
  ["warranty", "Warranty"],
  ["accountType", "Account type"],
  ["credits", "Included credits"],
  ["storage", "Storage"],
  ["compatibility", "Device compatibility"],
  ["notice", "Important notice"],
] as const;
export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const existing = categories.some((c) => c.id === product?.category);
  const [category, setCategory] = useState(
    existing
      ? product!.category
      : product
        ? "__custom"
        : (categories[0]?.id ?? "__custom"),
  );
  const [image, setImage] = useState(product?.image ?? "");
  const [preview, setPreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [variants, setVariants] = useState<ProductPriceOption[]>(
    product?.priceOptions ?? [],
  );
  const [details, setDetails] = useState<Partial<ProductDetails>>(
    product?.details ?? {},
  );
  const [faqs, setFaqs] = useState<NonNullable<Product["faqs"]>>(
    product?.faqs ?? [],
  );
  const [dirty, setDirty] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function patch(index: number, change: Partial<ProductPriceOption>) {
    setDirty(true);
    setVariants((v) =>
      v.map((o, i) => (i === index ? { ...o, ...change } : o)),
    );
  }
  function move(index: number, direction: number) {
    setDirty(true);
    setVariants((v) => {
      const next = [...v];
      const to = index + direction;
      if (to < 0 || to >= v.length) return v;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }
  function validate(data: FormData) {
    if (imageError) return imageError;
    try {
      parseProductOptions(String(data.get("priceOptions")));
      parseProductExtra(String(data.get("details")), "details");
      parseProductExtra(String(data.get("faqs")), "faqs");
    } catch {
      return "Check every plan: names, positive whole-DA prices and durations. Details need activation times in both languages; FAQ entries need both questions and answers.";
    }
    const file = data.get("imageUpload");
    if (!image && (!(file instanceof File) || !file.size))
      return "Choose a product image or enter its URL.";
    return null;
  }
  return (
    <ActionForm
      action={async (data) => {
        setDirty(false);
        try {
          await saveProductAction(data);
        } catch (error) {
          setDirty(true);
          throw error;
        }
      }}
      validate={validate}
      encType="multipart/form-data"
      onChange={() => setDirty(true)}
      className="grid gap-5"
    >
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input
        type="hidden"
        name="priceOptions"
        value={JSON.stringify(variants)}
      />
      <input
        type="hidden"
        name="details"
        value={JSON.stringify(
          Object.values(details).some(Boolean) ? details : null,
        )}
      />
      <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />
      <nav className="admin-form-tabs" aria-label="Product form sections">
        {[
          "Basics",
          "Image",
          "Content",
          "Plans",
          "Details",
          "FAQs",
          "Publishing",
        ].map((s) => (
          <a key={s} href={"#product-" + s.toLowerCase()}>
            {s}
          </a>
        ))}
      </nav>
      <section id="product-basics" className="admin-panel admin-form-section">
        <h2 className="admin-panel-title">Product basics</h2>
        <p className="admin-muted mb-5">
          Identify the product and set its base offer. Prices are whole Algerian
          dinars.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            name="name"
            label="Product name"
            value={product?.name}
            required
            max={180}
          />
          <Field
            name="nameAr"
            label="Arabic name"
            value={product?.nameAr}
            required
            max={180}
            dir="rtl"
          />
          <Field
            name="slug"
            label="URL slug"
            value={product?.slug}
            required
            max={160}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
          <label className="grid gap-2">
            Category
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.en}
                </option>
              ))}
              <option value="__custom">Create category</option>
            </select>
          </label>
          {category === "__custom" && (
            <>
              <Field
                name="customCategory"
                label="Category name"
                value={product?.category}
                required
                max={80}
              />
              <Field
                name="customCategoryAr"
                label="Arabic category name"
                value={product?.categoryAr}
                max={120}
                dir="rtl"
              />
            </>
          )}
          <Field
            name="price"
            label="Base price (DA)"
            type="number"
            value={product?.price}
            required
          />
          <Field
            name="oldPrice"
            label="Previous price (optional)"
            type="number"
            value={product?.oldPrice}
          />
          <Field
            name="duration"
            label="Base duration"
            value={product?.duration}
            required
            max={120}
          />
          <Field
            name="durationAr"
            label="Arabic duration"
            value={product?.durationAr}
            max={120}
            dir="rtl"
          />
          <Field
            name="activationTypeEn"
            label="Activation type"
            value={product?.activationTypeEn}
            max={160}
          />
          <Field
            name="activationTypeAr"
            label="Arabic activation type"
            value={product?.activationTypeAr}
            max={160}
            dir="rtl"
          />
        </div>
      </section>
      <section id="product-image" className="admin-panel admin-form-section">
        <h2 className="admin-panel-title">Product artwork</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
          <div className="h-44 rounded-xl bg-black/20 flex items-center justify-center">
            {preview || image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview || image}
                alt="Product preview"
                className="max-h-full max-w-full object-contain p-2"
              />
            ) : (
              <ImageUp size={36} className="text-slate-500" />
            )}
          </div>
          <div className="grid content-start gap-3">
            <p className="admin-muted">
              PNG, JPG, WEBP or AVIF · maximum 4 MB.
            </p>
            <label className="grid gap-2">
              Upload image
              <input
                name="imageUpload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) {
                    setPreview("");
                    setImageError("");
                    return;
                  }
                  if (
                    f.size > 4 * 1024 * 1024 ||
                    ![
                      "image/png",
                      "image/jpeg",
                      "image/webp",
                      "image/avif",
                    ].includes(f.type)
                  ) {
                    setImageError("Use a supported image smaller than 4 MB.");
                    e.target.value = "";
                    setPreview("");
                    return;
                  }
                  setImageError("");
                  setPreview(URL.createObjectURL(f));
                }}
              />
            </label>
            <label className="grid gap-2">
              Image URL or existing path
              <input
                name="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                maxLength={2000}
                placeholder="/products/example.webp"
              />
            </label>
            {imageError && (
              <p role="alert" className="text-red-300">
                {imageError}
              </p>
            )}
          </div>
        </div>
      </section>
      <section id="product-content" className="admin-panel admin-form-section">
        <h2 className="admin-panel-title">Localized content</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["shortDescriptionEn", "Description", product?.shortDescriptionEn],
            [
              "shortDescriptionAr",
              "Arabic description",
              product?.shortDescriptionAr,
            ],
            [
              "featuresEn",
              "Features · one per line",
              product?.featuresEn.join("\n"),
            ],
            [
              "featuresAr",
              "Arabic features · one per line",
              product?.featuresAr.join("\n"),
            ],
          ].map(([name, label, value]) => (
            <label key={name} className="grid gap-2">
              {label}
              <textarea
                name={name}
                rows={3}
                defaultValue={value ?? ""}
                dir={name?.endsWith("Ar") ? "rtl" : "ltr"}
                maxLength={name?.startsWith("features") ? 12000 : 1200}
              />
            </label>
          ))}
        </div>
      </section>
      <section id="product-plans" className="admin-panel admin-form-section">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="admin-panel-title">Plans & pricing</h2>
            <p className="admin-muted">
              Reorder, price and control each plan independently.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn"
            onClick={() => {
              setDirty(true);
              setVariants((v) => [
                ...v,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  labelAr: "",
                  duration: "",
                  durationAr: "",
                  price: 0,
                  available: true,
                },
              ]);
            }}
          >
            <Plus size={16} />
            Add plan
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          {variants.map((v, index) => (
            <article
              key={v.id}
              className="rounded-xl border border-white/10 p-4"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <strong>
                  Plan {index + 1} · {v.label || "New plan"}
                </strong>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={index === 0}
                    aria-label="Move plan up"
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={index === variants.length - 1}
                    aria-label="Move plan down"
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    aria-label="Remove plan"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this plan from the form? It is not saved until you save the product.",
                        )
                      ) {
                        setDirty(true);
                        setVariants((v) => v.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    "label",
                    "labelAr",
                    "duration",
                    "durationAr",
                    "compatibilityEn",
                    "compatibilityAr",
                  ] as const
                ).map((key) => (
                  <label key={key} className="grid gap-1 text-xs">
                    {
                      {
                        label: "Plan name",
                        labelAr: "Arabic plan name",
                        duration: "Duration",
                        durationAr: "Arabic duration",
                        compatibilityEn: "Device compatibility",
                        compatibilityAr: "Arabic compatibility",
                      }[key]
                    }
                    <input
                      required={!key.startsWith("compatibility")}
                      maxLength={120}
                      value={v[key] ?? ""}
                      dir={key.endsWith("Ar") ? "rtl" : "ltr"}
                      onChange={(e) => patch(index, { [key]: e.target.value })}
                    />
                  </label>
                ))}
                <label className="grid gap-1 text-xs">
                  Price (DA)
                  <input
                    required
                    type="number"
                    min={1}
                    step={1}
                    value={v.price || ""}
                    onChange={(e) =>
                      patch(index, { price: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  Previous price
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={v.oldPrice ?? ""}
                    onChange={(e) =>
                      patch(index, {
                        oldPrice: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </label>
              </div>
              <label className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v.available !== false}
                  onChange={(e) =>
                    patch(index, { available: e.target.checked })
                  }
                />
                Available for purchase
              </label>
            </article>
          ))}
        </div>
        {!variants.length && (
          <p className="admin-empty mt-4">
            The base price and duration will be used.
          </p>
        )}
      </section>
      <section id="product-details" className="admin-panel admin-form-section">
        <h2 className="admin-panel-title">Product details</h2>
        <p className="admin-muted mb-5">
          Keep the coverage and activation information accurate. If using
          details, fill both activation-time fields.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {detailFields.flatMap(([base, label]) =>
            (["En", "Ar"] as const).map((lang) => {
              const key = (base + lang) as keyof ProductDetails;
              return (
                <label className="grid gap-2" key={key}>
                  {label}
                  {lang === "Ar" ? " (Arabic)" : ""}
                  <input
                    value={details[key] ?? ""}
                    maxLength={base === "activationTime" ? 160 : 2000}
                    dir={lang === "Ar" ? "rtl" : "ltr"}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, [key]: e.target.value }))
                    }
                  />
                </label>
              );
            }),
          )}
        </div>
      </section>
      <section id="product-faqs" className="admin-panel admin-form-section">
        <div className="flex items-center justify-between gap-3">
          <h2 className="admin-panel-title">Product FAQs</h2>
          <button
            type="button"
            className="admin-btn"
            disabled={faqs.length >= 12}
            onClick={() => {
              setDirty(true);
              setFaqs((f) => [
                ...f,
                { questionEn: "", questionAr: "", answerEn: "", answerAr: "" },
              ]);
            }}
          >
            Add FAQ
          </button>
        </div>
        {faqs.map((faq, index) => (
          <div key={index} className="mt-4 border-t border-white/10 pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {(
                ["questionEn", "questionAr", "answerEn", "answerAr"] as const
              ).map((key) => (
                <label className="grid gap-1" key={key}>
                  {key.replace("En", " (English)").replace("Ar", " (Arabic)")}
                  <textarea
                    required
                    rows={2}
                    maxLength={key.startsWith("question") ? 300 : 1200}
                    dir={key.endsWith("Ar") ? "rtl" : "ltr"}
                    value={faq[key]}
                    onChange={(e) =>
                      setFaqs((f) =>
                        f.map((x, i) =>
                          i === index ? { ...x, [key]: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className="admin-btn mt-3"
              onClick={() => {
                setDirty(true);
                setFaqs((f) => f.filter((_, i) => i !== index));
              }}
            >
              Remove FAQ
            </button>
          </div>
        ))}
      </section>
      <section
        id="product-publishing"
        className="admin-panel admin-form-section"
      >
        <h2 className="admin-panel-title">Publishing</h2>
        <div className="flex gap-6 flex-wrap mt-4">
          <label className="flex items-center gap-3">
            <input
              name="available"
              type="checkbox"
              defaultChecked={product?.available ?? true}
            />
            Available
          </label>
          <label className="flex items-center gap-3">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={product?.featured ?? false}
            />
            Featured
          </label>
        </div>
      </section>
      <div className="admin-savebar">
        <span className="admin-muted">
          {dirty ? "Unsaved changes" : "Product editor"}
        </span>
        <div className="flex gap-2">
          <Link
            className="admin-btn"
            href="/admin/products"
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm("Leave without saving your changes?")
              )
                e.preventDefault();
            }}
          >
            Cancel
          </Link>
          <button type="submit" className="admin-btn admin-btn-primary">
            <Save size={16} />
            Save product
          </button>
        </div>
      </div>
    </ActionForm>
  );
}
function Field({
  name,
  label,
  value,
  type = "text",
  required,
  max,
  pattern,
  dir,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  max?: number;
  pattern?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <label className="grid gap-2">
      {label}
      {required ? " *" : ""}
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={required}
        maxLength={max}
        pattern={pattern}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? 1 : undefined}
        dir={dir}
      />
    </label>
  );
}
