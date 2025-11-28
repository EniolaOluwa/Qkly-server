import { ApiProperty } from "@nestjs/swagger";
import { type } from "os";
import { CustomStylingDto } from "./lead.dto";

// Swagger Response DTOs
export class FormInputSchema {
  @ApiProperty({ example: 'text' })
  type: string;

  @ApiProperty({ example: 'Full Name' })
  label: string;

  @ApiProperty({ example: 'name' })
  name: string;

  @ApiProperty({ example: true })
  required: boolean;

  @ApiProperty({ example: 'Enter your full name', required: false })
  placeholder?: string;
}

export class PublicFormResponseDto {
  @ApiProperty({ example: 'abc123xyz' })
  id: string;

  @ApiProperty({ example: 'Contact Us' })
  title: string;

  @ApiProperty({ example: 'We would love to hear from you' })
  description: string;

  @ApiProperty({ example: 'Submit' })
  buttonText: string;

  @ApiProperty({ type: [FormInputSchema] })
  inputs: FormInputSchema[];

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  logoUrl?: string;

  @ApiProperty({ example: 'Thank you for your submission!' })
  successMessage: string;


  @ApiProperty({
    type: CustomStylingDto, // Reference the class/schema for the object's structure
    description: 'Custom styling for embedded form',
    required: false,
  })
  customStyling?: CustomStylingDto;

  @ApiProperty({ example: true })
  canSubmit: boolean;

  @ApiProperty({ example: false })
  requireEmailVerification: boolean;

  @ApiProperty({ example: true })
  enableCaptcha: boolean;
}

export class LeadSubmissionResponseDataDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Thank you! Your submission has been received.' })
  message: string;

  @ApiProperty({ example: 'https://example.com/thank-you', required: false, nullable: true })
  redirectUrl?: string;
}

export class LeadSubmissionResponseDto {
  @ApiProperty({ type: LeadSubmissionResponseDataDto })
  data: LeadSubmissionResponseDataDto;

  @ApiProperty({ example: 'Lead submitted successfully' })
  message: string;
}

export class FormResponseDto {
  @ApiProperty({ type: PublicFormResponseDto })
  data: PublicFormResponseDto;

  @ApiProperty({ example: 'Form retrieved successfully' })
  message: string;
}