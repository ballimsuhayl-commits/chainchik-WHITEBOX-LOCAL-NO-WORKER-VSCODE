import { Env } from "@cc/shared";
import { bookCourierGuyShipment, getCourierGuyQuote, type Address, type Contact, type Parcel } from "./courierGuyPudo";

export type CourierBookingRequest = {
  orderId: string;
  deliveryAddress: Address;
  deliveryContact: Contact;
  parcels: Parcel[];
  serviceLevelCode: string;
};

export type CourierQuoteRequest = {
  deliveryAddress: Address;
  parcels: Parcel[];
};

export type CourierQuoteResult = {
  provider: "courier-guy";
  amountCents: number;
  currency: string;
  serviceLevelCode: string;
  raw: any;
};

export type CourierBookingResult = {
  provider: "courier-guy";
  trackingNumber: string;
  labelUrl?: string;
  raw: any;
};

export async function quoteWithCourierGuy(env: Env, req: CourierQuoteRequest): Promise<CourierQuoteResult> {
  const q = await getCourierGuyQuote(env, req.deliveryAddress, req.parcels);
  return { provider: "courier-guy", ...q };
}

export async function bookWithCourierGuy(env: Env, req: CourierBookingRequest): Promise<CourierBookingResult> {
  const b = await bookCourierGuyShipment(env, req.deliveryAddress, req.deliveryContact, req.parcels, req.serviceLevelCode);
  return { provider: "courier-guy", trackingNumber: b.trackingNumber, labelUrl: b.labelUrl, raw: b.raw };
}
