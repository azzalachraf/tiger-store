import { completionCompliments, getCompletionCompliment } from "../lib/telegram-completion-compliments";

for (const locale of ["ar", "en"] as const) {
  for (const gender of ["male", "female"] as const) {
    if (completionCompliments[locale][gender].length !== 10) throw new Error(`${locale}/${gender} must contain exactly ten compliments.`);
    if (!getCompletionCompliment(locale, gender, () => 0).trim()) throw new Error(`${locale}/${gender} must return a message.`);
  }
}

if (!getCompletionCompliment("ar", null, () => 0).includes("تم إكمال الطلب")) throw new Error("Neutral fallback is missing.");
console.log("Telegram completion compliments passed.");
