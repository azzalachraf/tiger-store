"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { deleteProductAction } from "@/app/admin/products/actions";
import { ActionForm } from "./ActionForm";
import { ExportControls, Pagination, StatusBadge } from "./TableControls";
export function ProductsWorkspace({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const filtered = products
    .filter(
      (p) =>
        (p.name + " " + p.nameAr + " " + p.slug)
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (category === "all" || p.category === category) &&
        (status === "all" ||
          (status === "available" ? p.available : !p.available)),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : a.name.localeCompare(b.name),
    );
  const current = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  const shown = filtered.slice((current - 1) * size, current * size);
  const chosen = filtered.filter((p) => selected.includes(p.id));
  const exporting = chosen.length ? chosen : filtered;
  const rows = exporting.flatMap((p) =>
    (p.priceOptions?.length
      ? p.priceOptions
      : [
          {
            id: "",
            label: p.duration,
            price: p.price,
            oldPrice: p.oldPrice,
            available: p.available,
          },
        ]
    ).map((o) => [
      p.id,
      p.name,
      p.nameAr,
      p.slug,
      p.category,
      o.id,
      o.label,
      o.price,
      o.oldPrice ?? "",
      p.available && o.available !== false,
      p.featured,
      p.image,
    ]),
  );
  function reset() {
    setPage(1);
    setSelected([]);
  }
  return (
    <>
      <div className="admin-metrics">
        {[
          ["Products", products.length],
          ["Available", products.filter((p) => p.available).length],
          ["Unavailable", products.filter((p) => !p.available).length],
          [
            "Plans",
            products.reduce((s, p) => s + (p.priceOptions?.length || 1), 0),
          ],
        ].map(([label, value]) => (
          <div className="admin-metric" key={label}>
            <p className="admin-metric-label">{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="admin-muted">
          {chosen.length
            ? chosen.length + " selected for export"
            : "Export includes all filtered products and their plans."}
        </p>
        <div className="flex flex-wrap gap-2">
          <ExportControls
            name="tiger-products"
            headers={[
              "Product ID",
              "Name",
              "Arabic name",
              "Slug",
              "Category",
              "Option ID",
              "Plan",
              "Price (DA)",
              "Old price (DA)",
              "Available",
              "Featured",
              "Image",
            ]}
            rows={rows}
          />
          <Link
            href="/admin/products/new"
            className="admin-btn admin-btn-primary"
          >
            <Plus size={16} />
            New product
          </Link>
        </div>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          Search products
          <input
            type="search"
            value={q}
            placeholder="Name, Arabic name or slug"
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
          />
        </label>
        <label>
          Availability
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              reset();
            }}
          >
            <option value="all">All products</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              reset();
            }}
          >
            <option value="all">All categories</option>
            {Array.from(new Set(products.map((p) => p.category)))
              .sort()
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              reset();
            }}
          >
            <option value="name">Name A–Z</option>
            <option value="price">Price: low first</option>
            <option value="price-desc">Price: high first</option>
          </select>
        </label>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table-responsive">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Select current page"
                  checked={
                    shown.length > 0 &&
                    shown.every((p) => selected.includes(p.id))
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? Array.from(
                            new Set([...selected, ...shown.map((p) => p.id)]),
                          )
                        : selected.filter(
                            (id) => !shown.some((p) => p.id === id),
                          ),
                    )
                  }
                />
              </th>
              {["Product", "Pricing", "Stock", "Actions"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={"Select " + p.name}
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.id]
                          : selected.filter((id) => id !== p.id),
                      )
                    }
                  />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <Image
                      src={p.image}
                      alt=""
                      width={46}
                      height={56}
                      className="h-14 w-12 rounded-lg object-contain bg-white/5"
                    />
                    <div>
                      <Link
                        href={
                          "/admin/products/" +
                          encodeURIComponent(p.id) +
                          "/edit"
                        }
                        className="font-bold"
                      >
                        {p.name}
                      </Link>
                      <p className="admin-muted" dir="auto">
                        {p.nameAr}
                      </p>
                      <p className="admin-muted">{p.category}</p>
                    </div>
                  </div>
                </td>
                <td data-label="Pricing">
                  <b>{p.price.toLocaleString("en-US")} DA</b>
                  <p className="admin-muted">
                    {p.priceOptions?.length || 1} plans
                  </p>
                </td>
                <td data-label="Stock">
                  <StatusBadge
                    status={p.available ? "available" : "unavailable"}
                  />
                  {p.featured && <p className="admin-muted mt-1">Featured</p>}
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="admin-btn"
                      href={
                        "/admin/products/" + encodeURIComponent(p.id) + "/edit"
                      }
                    >
                      <Pencil size={15} />
                      Edit
                    </Link>
                    <ActionForm
                      action={deleteProductAction}
                      confirmation={
                        "Permanently delete " +
                        p.name +
                        "? This removes the product from the catalog. Existing order records will remain."
                      }
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        className="admin-btn admin-btn-danger"
                        aria-label={"Delete " + p.name}
                      >
                        <Trash2 size={16} />
                      </button>
                    </ActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && (
        <div className="admin-empty">
          <h2>No matching products</h2>
          <button
            className="admin-btn"
            onClick={() => {
              setQ("");
              setStatus("all");
              setCategory("all");
              reset();
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <Pagination
        page={current}
        count={filtered.length}
        size={size}
        onPage={setPage}
        onSize={(n) => {
          setSize(n);
          setPage(1);
        }}
      />
    </>
  );
}
