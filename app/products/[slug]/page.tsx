import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetails } from "@/components/ProductDetails";
import { LocalizedText } from "@/components/LocalizedText";
import { getProductBySlug, getProducts } from "@/lib/admin-store";
import { categorySlug } from "@/lib/categories";
import { absoluteUrl, createPageMetadata, serializeJsonLd } from "@/lib/seo";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function productDescription(product: Product) {
  return product.shortDescriptionEn || product.shortDescriptionAr;
}

function productOffersJsonLd(product: Product, url: string) {
  const offers = product.priceOptions?.length
    ? product.priceOptions
    : [{ label: product.duration, price: product.price, available: product.available }];
  const availability = product.available
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const normalizedOffers = offers.map((offer) => ({
    "@type": "Offer",
    name: offer.label,
    priceCurrency: "DZD",
    price: Math.trunc(offer.price),
    availability: offer.available === false ? "https://schema.org/OutOfStock" : availability,
    url,
  }));

  if (normalizedOffers.length === 1) return normalizedOffers[0];

  const prices = normalizedOffers.map((offer) => offer.price);
  return {
    "@type": "AggregateOffer",
    priceCurrency: "DZD",
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: normalizedOffers.length,
    offers: normalizedOffers,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return createPageMetadata({
      title: "Product Not Found",
      description: "The requested Tiger Store product is unavailable.",
      path: "/products",
      robots: { index: false, follow: false },
    });
  }

  const title = product.name;
  const description = productDescription(product);
  const path = `/products/${product.slug}`;

  return createPageMetadata({
    title,
    description,
    path,
    image: product.image,
    imageAlt: `${product.name} product artwork`,
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const products = await getProducts();
  const relatedProducts = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);
  const productUrl = absoluteUrl(`/products/${product.slug}`);
  const productJsonLd = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: productDescription(product),
    image: [absoluteUrl(product.image)],
    url: productUrl,
    offers: productOffersJsonLd(product, productUrl),
  });
  const breadcrumbJsonLd = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category,
        item: absoluteUrl(`/categories/${categorySlug(product.category)}`),
      },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
    ],
  });

  return (
    <>
      <Header />
      <main className="store-shell min-h-screen px-3 py-6 sm:px-5 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <ProductDetails product={product} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

          {relatedProducts.length ? (
            <section className="mt-10">
              <div className="mb-5">
                <p className="font-bold text-tiger-gold">
                  <LocalizedText ar="منتجات مشابهة" en="Related Products" />
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  <LocalizedText ar="من نفس القسم" en="From the same category" />
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {relatedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
