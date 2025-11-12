import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreFrontDto } from './create-store-front.dto';

export class UpdateStoreFrontDto extends PartialType(CreateStoreFrontDto) {}
