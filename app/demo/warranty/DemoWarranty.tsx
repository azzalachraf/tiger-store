"use client";

import { useState } from "react";

export function DemoWarranty({ months }: { months: string }) {
  const [issued, setIssued] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("");
  const [payment, setPayment] = useState("");
  return <main className="store-shell min-h-screen px-4 py-8" dir="rtl"><section className="mx-auto max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-6 shadow-xl"><p className="text-sm font-black text-[#C54E00]">TIGER STORE · DEMO</p>{issued ? <div className="mt-4 space-y-3 text-[var(--text)]"><h1 className="text-3xl font-black">شهادة تجريبية</h1><p className="rounded-xl bg-[#FFF1E6] p-4 font-black text-[#7A3400]">هذه تجربة فقط وليست شهادة ضمان صالحة.</p><p><b>العميل:</b> {name}</p><p><b>اسم المستخدم:</b> {username}</p><p><b>المنصة:</b> {platform}</p><p><b>الخطة:</b> Snapchat Plus · {months} أشهر</p><button onClick={() => window.print()} className="min-h-12 w-full rounded-xl bg-[#FF7300] font-black text-black">تجربة تحميل PDF</button></div> : <form onSubmit={(event) => { event.preventDefault(); setIssued(true); }} className="mt-4 grid gap-4"><h1 className="text-3xl font-black text-[var(--text)]">تجربة نموذج الضمان</h1><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className="min-h-12 rounded-xl border bg-[var(--page)] px-3" /><input required minLength={2} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" className="min-h-12 rounded-xl border bg-[var(--page)] px-3" /><select required value={platform} onChange={(e) => setPlatform(e.target.value)} className="min-h-12 rounded-xl border bg-[var(--page)] px-3"><option value="">منصة التفعيل</option><option>Snapchat</option><option>Instagram</option><option>Facebook</option></select><input required minLength={6} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف" className="min-h-12 rounded-xl border bg-[var(--page)] px-3" /><select required value={payment} onChange={(e) => setPayment(e.target.value)} className="min-h-12 rounded-xl border bg-[var(--page)] px-3"><option value="">طريقة الدفع</option><option>BaridiMob</option><option>Binance</option><option>RedotPay</option><option>Flexy</option></select><button className="min-h-12 rounded-xl bg-[#FF7300] font-black text-black">إصدار شهادة تجريبية</button></form>}</section></main>;
}
