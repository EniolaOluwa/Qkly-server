import { IsString, IsOptional, IsArray, IsBoolean, ValidateNested, IsObject, IsUUID, IsEmail, ArrayMinSize, IsInt, IsUrl, Max, MaxLength, Min, MinLength, Matches, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class InputField {
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


export class FormInputDto {
  @ApiProperty({ example: 'email', description: 'Input type: email, text, phone, textarea, etc.' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  type: string;

  @ApiProperty({ example: 'Enter your email address' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  placeholder: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}


export class CustomStylingDto {
  @ApiPropertyOptional({ example: '#007bff' })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'primaryColor must be a valid hex color code'
  })
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'Arial, sans-serif' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontFamily?: string;

  @ApiPropertyOptional({ example: '8px' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(px|rem|em)$/, {
    message: 'borderRadius must be a valid CSS unit (px, rem, em)'
  })
  borderRadius?: string;
}

export class UtmParametersDto {
  @ApiPropertyOptional({ example: 'google' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: 'cpc' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  medium?: string;

  @ApiPropertyOptional({ example: 'spring_sale' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  campaign?: string;

  @ApiPropertyOptional({ example: 'running shoes' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  term?: string;

  @ApiPropertyOptional({ example: 'banner_ad' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  content?: string;
}


export class CreateLeadFormDto {
  @ApiProperty({
    example: 'Contact Us Form',
    description: 'Title of the lead form'
  })
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiPropertyOptional({
    example: 'Get in touch with us for any inquiries',
    description: 'Description of the form'
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    example: 'Submit',
    description: 'Text for the submit button'
  })
  @IsString()
  @MinLength(2, { message: 'Button text must be at least 2 characters long' })
  @MaxLength(50, { message: 'Button text cannot exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  buttonText: string;

  @ApiProperty({
    example: [
      { type: 'email', placeholder: 'Enter your email', required: true },
      { type: 'phone', placeholder: 'Enter your phone number', required: false }
    ],
    description: 'Array of form input fields',
    type: [FormInputDto]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one input field is required' })
  @ValidateNested({ each: true })
  @Type(() => FormInputDto)
  inputs: FormInputDto[];

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'URL of the logo to display on the form'
  })
  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether the form is active'
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Require email verification before accepting lead'
  })
  @IsOptional()
  @IsBoolean()
  requireEmailVerification?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Enable CAPTCHA verification'
  })
  @IsOptional()
  @IsBoolean()
  enableCaptcha?: boolean;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Send email notification on new lead'
  })
  @IsOptional()
  @IsBoolean()
  sendEmailNotification?: boolean;

  @ApiPropertyOptional({
    example: 'Thank you for your submission! We will contact you soon.',
    description: 'Custom success message after submission'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  successMessage?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/thank-you',
    description: 'Redirect URL after successful submission'
  })
  @IsOptional()
  @IsUrl({}, { message: 'Redirect URL must be a valid URL' })
  @MaxLength(500)
  redirectUrl?: string;

  @ApiPropertyOptional({
    example: 100,
    default: 0,
    description: 'Maximum submissions allowed (0 = unlimited)'
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  maxSubmissions?: number;

  @ApiPropertyOptional({
    example: ['example.com', 'app.example.com'],
    description: 'Allowed domains for CORS (for embedded forms)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({
    example: {
      primaryColor: '#007bff',
      fontFamily: 'Arial, sans-serif',
      borderRadius: '8px'
    },
    description: 'Custom styling for embedded form'
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomStylingDto)
  customStyling?: CustomStylingDto;

  // These will be set from auth context
  businessId: number;
  createdBy?: number;
}


export class UpdateLeadFormDto extends PartialType(CreateLeadFormDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  buttonText?: string;

  @ApiPropertyOptional({ type: [FormInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormInputDto)
  inputs?: FormInputDto[];
}


export class LeadFormResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  buttonText: string;

  @ApiProperty({ type: [FormInputDto] })
  inputs: FormInputDto[];

  @ApiProperty({ required: false })
  logoUrl?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  publicId: string;

  @ApiProperty()
  requireEmailVerification: boolean;

  @ApiProperty()
  enableCaptcha: boolean;

  @ApiProperty()
  sendEmailNotification: boolean;

  @ApiProperty({ required: false })
  successMessage?: string;

  @ApiProperty({ required: false })
  redirectUrl?: string;

  @ApiProperty()
  submissionCount: number;

  @ApiProperty()
  maxSubmissions: number;

  @ApiProperty()
  businessId: number;

  @ApiProperty()
  createdBy: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}


// Lead DTOs
// export class CreateLeadDto {
//   @ApiProperty({
//     description: 'Name of the lead',
//     example: 'John Doe',
//     required: false,
//   })
//   @IsOptional()
//   @IsString()
//   name?: string;

//   @ApiProperty({
//     description: 'Email address of the lead',
//     example: 'john@example.com',
//   })
//   @IsEmail()
//   email: string;

//   @ApiProperty({
//     description: 'Phone number of the lead',
//     example: '+234812345678',
//     required: false,
//   })
//   @IsOptional()
//   @IsString()
//   phone?: string;

//   @ApiProperty({
//     description: 'ID of the lead form this lead belongs to',
//     example: '123e4567-e89b-12d3-a456-426614174000',
//   })
//   @IsUUID()
//   formId: string;
// }


export class CreateLeadDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Name of the lead'
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(200, { message: 'Name cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the lead'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'Phone number of the lead'
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +2348012345678)'
  })
  phone?: string;

  @ApiPropertyOptional({
    example: {
      message: 'I am interested in your services',
      companySize: '10-50',
      budget: '$1000-$5000'
    },
    description: 'Additional form responses as key-value pairs'
  })
  @IsOptional()
  @IsObject()
  formResponses?: Record<string, any>;

  // These will be set internally
  formId?: number;
  businessId?: number;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({ example: '+2348098765432' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format'
  })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  formResponses?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'contacted',
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost']
  })
  @IsOptional()
  @IsEnum(['new', 'contacted', 'qualified', 'converted', 'lost'], {
    message: 'Status must be one of: new, contacted, qualified, converted, lost'
  })
  status?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isContacted?: boolean;

  @ApiPropertyOptional({
    example: 'Customer expressed interest in premium package'
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => value?.trim())
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}





export class LeadResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty()
  formId: number;

  @ApiProperty()
  businessId: number;

  @ApiProperty({ required: false })
  formResponses?: Record<string, any>;

  @ApiProperty({ required: false })
  ipAddress?: string;

  @ApiProperty({ required: false })
  userAgent?: string;

  @ApiProperty({ required: false })
  referrer?: string;

  @ApiProperty({ type: UtmParametersDto, required: false })
  utmParameters?: UtmParametersDto;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  deviceType?: string;

  @ApiProperty({ required: false })
  browser?: string;

  @ApiProperty({ required: false })
  operatingSystem?: string;

  @ApiProperty()
  isContacted: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  createdAt: Date;
}


export class LeadFilterDto {
  @ApiPropertyOptional({
    example: 'new',
    enum: ['new', 'contacted', 'qualified', 'converted', 'lost']
  })
  @IsOptional()
  @IsEnum(['new', 'contacted', 'qualified', 'converted', 'lost'])
  status?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isContacted?: boolean;

  @ApiPropertyOptional({ example: 'mobile' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format'
  })
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format'
  })
  endDate?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
