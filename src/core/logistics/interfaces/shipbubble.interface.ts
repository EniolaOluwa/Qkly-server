export interface ShipBubbleResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface AddressCodeData {
  address_code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface PackageCategory {
  id: number;
  name: string;
  description: string;
}

export interface ShippingRate {
  courier_id: string;
  courier_name: string;
  service_code: string;
  service_name: string;
  total_fee: number;
  currency: string;
  estimated_delivery_date: string;
}

export interface RatesResponseData {
  request_token: string;
  rates: ShippingRate[];
}

export interface LabelResponseData {
  shipment_id: string;
  tracking_number: string;
  tracking_url: string;
  waybill_url: string;
  courier_id: string;
  courier_name: string;
  status: string;
}
