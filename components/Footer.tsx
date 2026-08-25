import Image from "next/image";
import Link from "next/link";

export function Footer({ disclaimer }: { disclaimer?: string }) {
  return (
    <footer className="bg-[#17120F] text-[#F3F0EA]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-3 py-10 sm:px-5 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="relative h-14 w-40"><Image src="/logo/tiger-store-ui.png" alt="Tiger Store" fill sizes="160px" className="object-contain object-left" /></div>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#F3F0EA]/75">Digital subscriptions for AI, design, learning, and software.</p>
          <p className="mt-3 max-w-lg text-xs leading-6 text-[#F3F0EA]/55">{disclaimer ?? "Tiger Store is an independent digital subscription provider and is not officially affiliated with the brands listed."}</p>
        </div>
        <FooterGroup title="Explore" links={[['/shop', 'Shop'], ['/categories', 'Categories'], ['/payment-methods', 'Payment methods'], ['/faq', 'FAQ']]} />
        <div>
          <h2 className="font-black">Support</h2>
          <div className="mt-3 grid gap-2 text-sm text-[#F3F0EA]/75"><Link href="/contact" className="hover:text-[#FF7300]">Contact</Link><Link href="/refund-policy" className="hover:text-[#FF7300]">Refund policy</Link><a href="https://www.instagram.com/tigerr_store_dz/" target="_blank" rel="noreferrer" className="hover:text-[#FF7300]">Instagram</a><a href="https://www.facebook.com/people/Tiger-Store/61589903873726/" target="_blank" rel="noreferrer" className="hover:text-[#FF7300]">Facebook</a></div>
        </div>
      </div>
      <div className="border-t border-[#F3F0EA]/15 px-3 py-4 text-center text-xs text-[#F3F0EA]/55">© 2026 Tiger Store · tiger-storedz.com</div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) {
  return <div><h2 className="font-black">{title}</h2><div className="mt-3 grid gap-2 text-sm text-[#F3F0EA]/75">{links.map(([href, label]) => <Link key={href} href={href} className="hover:text-[#FF7300]">{label}</Link>)}</div></div>;
}
