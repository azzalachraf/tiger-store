import type { ReactNode } from "react";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
