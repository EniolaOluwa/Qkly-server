import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class RawBodyPipe implements PipeTransform {
  transform(value: any) {
    return value;
  }
}