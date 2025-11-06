import { PaginationResultDto } from '../queries/dto/pagination.dto';

export class HttpResponse {
  static success(payload: { data: any; message: string }) {
    if (payload.data instanceof PaginationResultDto) {
      return {
        success: true,
        data: payload.data.data,
        message: payload.message,
        meta: payload.data.meta,
      };
    }

    return {
      success: true,
      data: payload.data,
      message: payload.message,
    };
  }

  static error(data: { data: any; message: string }) {
    return {
      success: false,
      data: data.data,
      message: data.message,
    };
  }
}
