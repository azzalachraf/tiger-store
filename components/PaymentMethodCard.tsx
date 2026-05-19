import Image from "next/image";
import { PaymentMethod } from "@/lib/types";

type PaymentMethodCardProps = {
  method: PaymentMethod;
};

const paymentLogos: Record<string, string> = {
  BaridiMob: "/logos/payments/baridimob.png",
  CCP: "/logos/payments/algerie-poste.svg",
  RedotPay: "/logos/payments/redotpay.svg",
};

export function PaymentMethodCard({ method }: PaymentMethodCardProps) {
  const logo = paymentLogos[method.name] ?? "/logos/contact/tiger-store.png";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white p-2">
        <Image src={logo} alt={`${method.name} logo`} width={44} height={44} className="h-full w-full object-contain" />
      </span>
      <h3 className="text-lg font-extrabold text-white">{method.name}</h3>
      <p className="mt-2 text-sm leading-7 text-white/62">{method.description.ar}</p>
    </div>
  );
}
