"use client";
import { useState } from "react";
type Copy = { review: string; name: string; familyName: string; user: string; phone: string; email: string; paymentMethod: string; confirm: string; back: string; next: string; paymentOptions: { placeholder: string; baridiMob: string; binance: string; redotPay: string; flexy: string } };

export function WarrantyForm({ token, copy, action }: { token: string; copy: Copy; action: (formData: FormData) => void | Promise<void> }) {
  const [review, setReview] = useState(false);
  const [values, setValues] = useState({ name: "", familyName: "", username: "", phone: "", email: "", paymentMethod: "" });
  const reviewFields: [keyof typeof values, string][] = [["name", copy.name], ["familyName", copy.familyName], ["username", copy.user], ["phone", copy.phone], ["email", copy.email], ["paymentMethod", copy.paymentMethod]];
  const requiredValuesComplete = values.name.trim().length >= 2
    && values.familyName.trim().length >= 2
    && values.username.trim().length >= 2
    && values.phone.trim().length >= 6
    && values.email.trim().length > 3
    && values.paymentMethod.length > 0;

  if (review) return <form action={action} className="grid gap-4"><input type="hidden" name="token" value={token} /><p className="rounded-xl bg-[var(--page)] p-3 text-sm text-[var(--muted-text)]">{copy.review}</p>{reviewFields.map(([key, label]) => <div key={key} className="rounded-xl border border-[var(--border-color)] p-3"><b>{label}</b><p>{values[key]}</p><input type="hidden" name={key} value={values[key]} /></div>)}<button type="button" onClick={() => setReview(false)} className="min-h-11 rounded-xl border border-[var(--border-color)] font-black text-[var(--text)]">{copy.back}</button><button className="min-h-12 rounded-xl bg-[#FF7300] font-black text-black">{copy.confirm}</button></form>;

  return <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (requiredValuesComplete) setReview(true); }}>
    <RequiredInput label={copy.name} type="text" value={values.name} minLength={2} maxLength={160} autoComplete="name" onChange={(value) => setValues({ ...values, name: value })} />
    <RequiredInput label={copy.familyName} type="text" value={values.familyName} minLength={2} maxLength={160} autoComplete="family-name" onChange={(value) => setValues({ ...values, familyName: value })} />
    <RequiredInput label={copy.user} type="text" value={values.username} minLength={2} maxLength={80} autoComplete="username" onChange={(value) => setValues({ ...values, username: value })} />
    <label className="grid gap-1 font-bold text-[var(--text)]">{copy.paymentMethod} *<select required aria-required="true" value={values.paymentMethod} onChange={(event) => setValues({ ...values, paymentMethod: event.target.value })} className="min-h-12 rounded-xl border border-[var(--border-color)] bg-[var(--page)] px-3"><option value="" disabled>{copy.paymentOptions.placeholder}</option><option value="BaridiMob">{copy.paymentOptions.baridiMob}</option><option value="Binance">{copy.paymentOptions.binance}</option><option value="RedotPay">{copy.paymentOptions.redotPay}</option><option value="Flexy">{copy.paymentOptions.flexy}</option></select></label>
    <RequiredInput label={copy.phone} type="tel" value={values.phone} minLength={6} maxLength={40} autoComplete="tel" onChange={(value) => setValues({ ...values, phone: value })} />
    <RequiredInput label={copy.email} type="email" value={values.email} maxLength={180} autoComplete="email" onChange={(value) => setValues({ ...values, email: value })} />
    <button type="submit" disabled={!requiredValuesComplete} className="min-h-12 rounded-xl bg-[#FF7300] font-black text-black disabled:opacity-50">{copy.next}</button>
  </form>;
}

function RequiredInput({ label, type, value, minLength, maxLength, autoComplete, onChange }: { label: string; type: "text" | "tel" | "email"; value: string; minLength?: number; maxLength: number; autoComplete: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 font-bold text-[var(--text)]">{label} *<input required aria-required="true" type={type} value={value} minLength={minLength} maxLength={maxLength} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-xl border border-[var(--border-color)] bg-[var(--page)] px-3" /></label>;
}
