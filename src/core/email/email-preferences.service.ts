import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { randomBytes } from 'crypto';
import { EmailUnsubscription, EmailCategory } from './entities/email-unsubscription.entity';

@Injectable()
export class EmailPreferencesService {
  private readonly logger = new Logger(EmailPreferencesService.name);

  constructor(
    @InjectRepository(EmailUnsubscription)
    private readonly unsubscriptionRepo: Repository<EmailUnsubscription>,
  ) { }

  /**
   * Generate a unique unsubscribe token
   */
  generateUnsubscribeToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create or get existing unsubscribe token for an email
   */
  async getOrCreateToken(
    email: string,
    category: EmailCategory = EmailCategory.MARKETING,
    businessId?: number,
  ): Promise<string> {
    // Check if token already exists
    const existing = await this.unsubscriptionRepo.findOne({
      where: { email, category, businessId: businessId ?? IsNull(), isActive: false },
    });

    if (existing) {
      return existing.unsubscribeToken;
    }

    // Create a new token entry (inactive until user clicks unsubscribe)
    const token = this.generateUnsubscribeToken();
    const unsubscription = this.unsubscriptionRepo.create({
      email,
      category,
      businessId: businessId || null,
      unsubscribeToken: token,
      isActive: false, // Not active until confirmed
    });

    await this.unsubscriptionRepo.save(unsubscription);
    return token;
  }

  /**
   * Process unsubscribe request
   */
  async unsubscribe(token: string): Promise<{ email: string; category: EmailCategory; businessId?: number }> {
    const unsubscription = await this.unsubscriptionRepo.findOne({
      where: { unsubscribeToken: token },
      relations: ['business'],
    });

    if (!unsubscription) {
      throw new NotFoundException('Invalid unsubscribe token');
    }

    // Activate the unsubscription
    unsubscription.isActive = true;
    await this.unsubscriptionRepo.save(unsubscription);

    this.logger.log(`User ${unsubscription.email} unsubscribed from ${unsubscription.category} emails`);

    return {
      email: unsubscription.email,
      category: unsubscription.category,
      businessId: unsubscription.businessId || undefined,
    };
  }

  /**
   * Resubscribe an email
   */
  async resubscribe(token: string): Promise<void> {
    const unsubscription = await this.unsubscriptionRepo.findOne({
      where: { unsubscribeToken: token },
    });

    if (!unsubscription) {
      throw new NotFoundException('Invalid token');
    }

    unsubscription.isActive = false;
    await this.unsubscriptionRepo.save(unsubscription);

    this.logger.log(`User ${unsubscription.email} resubscribed to ${unsubscription.category} emails`);
  }

  /**
   * Check if an email is unsubscribed from a category
   */
  async isUnsubscribed(
    email: string,
    category: EmailCategory,
    businessId?: number,
  ): Promise<boolean> {
    // Check for "all" category (platform-wide unsubscribe)
    const allUnsubscribed = await this.unsubscriptionRepo.findOne({
      where: { email, category: EmailCategory.ALL, isActive: true },
    });

    if (allUnsubscribed) {
      return true;
    }

    // Check for specific category + business
    const specificUnsubscription = await this.unsubscriptionRepo.findOne({
      where: [
        // Platform-wide for this category
        { email, category, businessId: IsNull(), isActive: true },
        // Business-specific for this category
        ...(businessId ? [{ email, category, businessId, isActive: true }] : []),
      ],
    });

    return !!specificUnsubscription;
  }

  /**
   * Get all unsubscription preferences for an email
   */
  async getPreferences(email: string): Promise<EmailUnsubscription[]> {
    return this.unsubscriptionRepo.find({
      where: { email, isActive: true },
      relations: ['business'],
    });
  }

  /**
   * Get unsubscription by token (for preference page)
   */
  async getByToken(token: string): Promise<EmailUnsubscription | null> {
    return this.unsubscriptionRepo.findOne({
      where: { unsubscribeToken: token },
      relations: ['business'],
    });
  }
}
