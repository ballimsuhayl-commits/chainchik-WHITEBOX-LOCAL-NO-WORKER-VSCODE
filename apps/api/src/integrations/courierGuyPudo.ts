import { Env } from "@cc/shared";

export type Address = Record<string, any>;
export type Contact = { name: string; email?: string; mobile_number: string; [k: string]: any; };

export type Parcel = {
  submitted_length_cm: string;
  submitted_width_cm: string;
  submitted_height_cm: string;
  submitted_weight_kg: string;
  parcel_description?: string;
  alternative_tracking_reference?: string;
};

export type QuoteResult = {
  amountCents: number;
  currency: string;
  serviceLevelCode: string;
  raw: any;
};

function mustJson<T>(s: string | undefined, friendly: string): T {
  if (!s) throw new Error(`${friendly} missing`);
  try { return JSON.parse(s) as T; } catch { throw new Error(`${friendly} is not valid JSON`); }
}

export async function getCourierGuyQuote(env: Env, deliveryAddress: Address, parcels: Parcel[]): Promise<QuoteResult> {
  if (!env.COURIER_GUY_API_KEY) throw new Error("COURIER_GUY_API_KEY not set");
  const collection_address = mustJson<Address>(env.COURIER_GUY_COLLECTION_ADDRESS_JSON, "COURIER_GUY_COLLECTION_ADDRESS_JSON");

  const url = new URL("/rates", env.COURIER_GUY_BASE_URL);
  url.searchParams.set("api_key", env.COURIER_GUY_API_KEY);

  const body = { collection_address, delivery_address: deliveryAddress, parcels };
  const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Courier quote failed (${res.status}): ${await res.text()}`);
  const data = await res.json();

  const rates = Array.isArray(data?.rates) ? data.rates : [];
  if (!rates.length) throw new Error("No courier rates returned");

  let best = rates[0];
  let bestRate = Number(best?.rate ?? Number.POSITIVE_INFINITY);
  for (const r of rates) {
    const v = Number(r?.rate ?? Number.POSITIVE_INFINITY);
    if (Number.isFinite(v) && v < bestRate) { best = r; bestRate = v; }
  }

  const serviceLevelCode = String(best?.service_level?.code ?? best?.service_level_code ?? "").trim();
  if (!serviceLevelCode) throw new Error("Rate missing service level code");

  return { amountCents: Math.round(bestRate * 100), currency: "ZAR", serviceLevelCode, raw: data };
}

export async function bookCourierGuyShipment(env: Env, deliveryAddress: Address, deliveryContact: Contact, parcels: Parcel[], serviceLevelCode: string) {
  if (!env.COURIER_GUY_API_KEY) throw new Error("COURIER_GUY_API_KEY not set");

  const collection_address = mustJson<Address>(env.COURIER_GUY_COLLECTION_ADDRESS_JSON, "COURIER_GUY_COLLECTION_ADDRESS_JSON");
  const collection_contact = mustJson<Contact>(env.COURIER_GUY_COLLECTION_CONTACT_JSON, "COURIER_GUY_COLLECTION_CONTACT_JSON");

  const url = new URL("/shipments", env.COURIER_GUY_BASE_URL);
  url.searchParams.set("api_key", env.COURIER_GUY_API_KEY);

  const payload = {
    collection_min_date: new Date().toISOString(),
    collection_address,
    special_instructions_collection: "None",
    collection_contact,
    delivery_min_date: new Date().toISOString(),
    delivery_address: deliveryAddress,
    delivery_contact: deliveryContact,
    parcels,
    opt_in_rates: [],
    opt_in_time_based_rates: [],
    service_level_code: serviceLevelCode
  };

  const res = await fetch(url.toString(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Courier booking failed (${res.status}): ${await res.text()}`);
  const data = await res.json();

  const shipmentId = String(data?.id ?? "").trim();
  const trackingNumber = String(data?.custom_tracking_reference ?? shipmentId).trim();
  if (!shipmentId) throw new Error("Booking succeeded but shipment id missing in response");

  const waybillUrl = new URL(`/generate/waybill/${encodeURIComponent(shipmentId)}`, env.COURIER_GUY_BASE_URL);
  waybillUrl.searchParams.set("api_key", env.COURIER_GUY_API_KEY);

  return { shipmentId, trackingNumber, labelUrl: waybillUrl.toString(), raw: data };
}
