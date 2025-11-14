import { IsString, IsOptional, IsArray, IsBoolean, ValidateNested, IsObject, IsUUID, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';

class InputField {
  @ApiProperty({
    description: 'Input field type (e.g., text, email, phone, textarea)',
    example: 'email',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Placeholder text for the input field',
    example: 'Enter your email address',
  })
  @IsString()
  placeholder: string;
}

export class CreateLeadFormDto {
  @ApiProperty({
    description: 'Title of the lead form',
    example: 'Contact Us',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Description of the lead form',
    example: 'Please fill out this form to get in touch with us',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Button text for form submission',
    example: 'Submit',
  })
  @IsString()
  buttonText: string;

  @ApiProperty({
    type: [InputField],
    description: 'Array of input fields for the form',
    example: [
      { type: 'email', placeholder: 'Enter your email' },
      { type: 'phone', placeholder: 'Enter your phone number' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InputField)
  inputs: InputField[];

  @ApiProperty({
    description: 'Logo URL for the lead form',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({
    description: 'Whether the form is active or not',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLeadFormDto extends PartialType(CreateLeadFormDto) {}

export class LeadFormResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the lead form',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Title of the lead form',
    example: 'Contact Us',
  })
  title: string;

  @ApiProperty({
    description: 'Description of the lead form',
    example: 'Please fill out this form to get in touch with us',
  })
  description?: string;

  @ApiProperty({
    description: 'Button text for form submission',
    example: 'Submit',
  })
  buttonText: string;

  @ApiProperty({
    type: [InputField],
    description: 'Array of input fields for the form',
  })
  inputs: InputField[];

  @ApiProperty({
    description: 'Logo URL for the lead form',
    example: 'https://example.com/logo.png',
  })
  logoUrl?: string;

  @ApiProperty({
    description: 'Whether the form is active or not',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Date when the form was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the form was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

// Lead DTOs
export class CreateLeadDto {
  @ApiProperty({
    description: 'Name of the lead',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email address of the lead',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Phone number of the lead',
    example: '+234812345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'ID of the lead form this lead belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  formId: string;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}

export class LeadResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the lead',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Name of the lead',
    example: 'John Doe',
  })
  name?: string;

  @ApiProperty({
    description: 'Email address of the lead',
    example: 'john@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number of the lead',
    example: '+234812345678',
  })
  phone?: string;

  @ApiProperty({
    description: 'ID of the associated lead form',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  formId: string;

  @ApiProperty({
    description: 'Date when the lead was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}
