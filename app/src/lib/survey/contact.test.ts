import { describe, expect, it } from "vitest";
import { checkContact } from "./contact";

const ok = { name: "Asha", phone: "98765 43210", email: "", consent: true };

describe("checkContact", () => {
  it("accepts a name with a WhatsApp number, stored as +91", () => {
    expect(checkContact(ok)).toEqual({ ok: true, contact: { name: "Asha", email: null, phone: "+919876543210", whatsappOptin: false } });
  });

  it("accepts an email instead of a number, lower-cased", () => {
    const r = checkContact({ name: " Ravi ", email: "Ravi@Example.com", consent: true });
    expect(r).toEqual({ ok: true, contact: { name: "Ravi", email: "ravi@example.com", phone: null, whatsappOptin: false } });
  });

  it("needs a name, a number or an email, and consent", () => {
    const r = checkContact({ name: "  ", phone: "", email: "", consent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["consent", "name", "phone"]);
    expect(checkContact(undefined).ok).toBe(false);
  });

  it("rejects numbers that are not Indian mobiles and bad emails", () => {
    expect(checkContact({ ...ok, phone: "12345" }).ok).toBe(false);
    expect(checkContact({ ...ok, phone: "", email: "not-an-email" }).ok).toBe(false);
  });

  it("keeps the WhatsApp opt-in only when there is a number", () => {
    const withPhone = checkContact({ ...ok, whatsappOptin: true });
    const emailOnly = checkContact({ name: "Asha", email: "a@b.co", whatsappOptin: true, consent: true });
    expect(withPhone.ok && withPhone.contact.whatsappOptin).toBe(true);
    expect(emailOnly.ok && emailOnly.contact.whatsappOptin).toBe(false);
  });

  it("caps names at 80 characters", () => {
    expect(checkContact({ ...ok, name: "a".repeat(81) }).ok).toBe(false);
  });
});
