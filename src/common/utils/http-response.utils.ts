import { PaginationResultDto } from '../queries/dto/pagination.dto';

export class HttpResponse {
  static success(payload: { data: any; message: string, statusCode?: number }) {
    if (payload.data instanceof PaginationResultDto) {
      return {
        success: true,
        data: payload.data.data,
        message: payload.message,
        meta: payload.data.meta,
        statusCode: payload.statusCode,
      };
    }

    return {
      success: true,
      data: payload.data,
      message: payload.message,
      statusCode: payload.statusCode,
    };
  }

  static error(data: { data: any; message: string, statusCode?: number }) {
    return {
      success: false,
      data: data.data,
      message: data.message,
      statusCode: data.statusCode,
    };
  }
}
