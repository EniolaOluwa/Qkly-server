// monnify-response.interface.ts

// Base response structure for Monnify API
export interface MonnifyBaseResponse {
  requestSuccessful: boolean;
  responseMessage?: string;
  responseCode?: string;
}

// Successful Monnify API response
export interface MonnifySuccessResponse<T> extends MonnifyBaseResponse {
  responseBody: T;
}

// Error response from Monnify API
export interface MonnifyErrorResponse extends MonnifyBaseResponse {
  responseBody?: any;
}

// Axios error with Monnify response data
export interface MonnifyAxiosError {
  response?: {
    data?: MonnifyErrorResponse;
    status?: number;
    headers?: any;
  };
  request?: any;
  message: string;
}

// Payment initialization response body
export interface MonnifyPaymentInitResponseBody {
  transactionReference?: string;
  paymentReference?: string;
  merchantName?: string;
  apiKey?: string;
  amount?: number;
  currencyCode?: string;
  customerName?: string;
  customerEmail?: string;
  paymentDescription?: string;
  paymentMethods?: string[];
  paymentMethod?: string;
  transactionHash?: string;
  merchantCode?: string;
  checkoutUrl: string;
  defaultPaymentMethod?: string;
  expiresAt?: string;
  amountPaid?: number;
  completedOn?: string;
}

// Auth response body
export interface MonnifyAuthResponseBody {
  accessToken: string;
  expiresIn: number;
}

// Transaction verification response body
export interface MonnifyTransactionResponseBody {
  amount: number;
  currencyCode: string;
  customerEmail: string;
  customerName: string;
  paymentDescription?: string;
  paymentReference: string;
  paymentStatus: string;
  transactionReference: string;
  paymentMethod: string;
  paidAmount: number;
  createdOn: string;
  transactionHash: string;
  meta?: any;
}