export interface QklyErrorResp {
  readonly message: string;
  readonly status: number;
  readonly data?: object;
  readonly location?: string; // the name of the function where the error occured or any tracable desc
}

export interface QklySucessResp {
  readonly message: string;
  readonly status: number;
  readonly data?: object;
}
