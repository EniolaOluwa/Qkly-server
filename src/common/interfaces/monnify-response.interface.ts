export interface MonnifyBaseResponse {
  requestSuccessful: boolean;
  responseMessage?: string;
  responseCode?: string;
}

export interface MonnifySuccessResponse<ResponseBody> extends MonnifyBaseResponse {
  responseBody: ResponseBody;
}

export interface MonnifyErrorResponse extends MonnifyBaseResponse {
  responseBody?: any;
}

export interface MonnifyAxiosError {
  response?: {
    data?: MonnifyErrorResponse;
    status?: number;
    headers?: any;
  };
  request?: any;
  message: string;
}

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

export interface MonnifyAuthResponseBody {
  accessToken: string;
  expiresIn: number;
}

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
