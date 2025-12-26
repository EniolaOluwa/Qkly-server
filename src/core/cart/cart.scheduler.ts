import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartAbandonment } from './entities/cart-abandonment.entity';
import { CartService } from './cart.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class CartScheduler {
  private readonly logger = new Logger(CartScheduler.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartAbandonment)
    private readonly abandonmentRepository: Repository<CartAbandonment>,
    private readonly notificationService: NotificationService,
    private readonly cartService: CartService,
  ) { }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.debug('Running Cart Abandonment Scheduler...');
    await this.checkAbandonment();
    await this.processReminders();
    await this.clearStaleCarts();
  }

  /**
   * Stage 1: Identify abandoned carts (Idle > 1 hour)
   */
  private async checkAbandonment() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const staleCarts = await this.cartRepository.find({
      where: {
        updatedAt: LessThan(oneHourAgo),
        status: 'ACTIVE',
      },
      relations: ['user'],
    });

    for (const cart of staleCarts) {
      // Check if already tracked
      const existing = await this.abandonmentRepository.findOne({ where: { cartId: cart.id } });
      if (existing) continue;

      // Create abandonment record
      const abandonment = this.abandonmentRepository.create({
        cartId: cart.id,
        status: 'IDENTIFIED',
        customerEmail: cart.user?.email,
        cartValue: cart.subtotal,
        itemCount: cart.itemCount,
        nextReminderAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Schedule 1st reminder in 24h
      });

      await this.abandonmentRepository.save(abandonment);

      // Update cart status to ABANDONED so we don't pick it up again as "active"
      cart.status = 'ABANDONED';
      cart.abandonedAt = new Date();
      await this.cartRepository.save(cart);

      this.logger.log(`Cart ${cart.id} identified as abandoned`);
    }
  }

  /**
   * Stage 2: Process Reminders (24h, 48h, 72h)
   */
  private async processReminders() {
    const now = new Date();
    const unpaidAbandonments = await this.abandonmentRepository.find({
      where: {
        nextReminderAt: LessThan(now),
        isRecovered: false,
        status: 'IDENTIFIED', // Or match multiple statuses if implementing flow
      },
      relations: ['cart', 'cart.items', 'cart.items.product', 'cart.items.product.images'],
      // Assuming product images relation exists, otherwise just product
    });

    // Actually, status updates will change the `status` field, so we need to query based on that workflow
    // Let's iterate through "due" items regardless of status (except RECOVERED/EXPIRED)
    // But for simplicity, let the status drive the flow.

    const dueReminders = await this.abandonmentRepository.createQueryBuilder('abandonment')
      .leftJoinAndSelect('abandonment.cart', 'cart')
      .leftJoinAndSelect('cart.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.variant', 'variant')
      .where('abandonment.nextReminderAt <= :now', { now })
      .andWhere('abandonment.isRecovered = :recovered', { recovered: false })
      .andWhere('abandonment.status IN (:...statuses)', { statuses: ['IDENTIFIED', 'REMINDER_SENT', 'REMINDER_2_SENT'] })
      .getMany();

    for (const abandonment of dueReminders) {
      if (!abandonment.customerEmail) continue;

      let nextStatus = '';
      let stage = 0;
      let nextReminderDelay = 0;

      switch (abandonment.status) {
        case 'IDENTIFIED':
          stage = 1; // 24h reminder
          nextStatus = 'REMINDER_SENT';
          nextReminderDelay = 24; // +24h for next
          abandonment.firstReminderSentAt = new Date();
          break;
        case 'REMINDER_SENT':
          stage = 2; // 48h reminder
          nextStatus = 'REMINDER_2_SENT';
          nextReminderDelay = 24; // +24h for next (total 72h)
          abandonment.secondReminderSentAt = new Date();
          break;
        case 'REMINDER_2_SENT':
          stage = 3; // 72h reminder
          nextStatus = 'REMINDER_3_SENT'; // Final
          nextReminderDelay = 0; // No more reminders
          abandonment.thirdReminderSentAt = new Date();
          break;
      }

      // Send Email
      if (stage > 0) {
        await this.notificationService.sendCartReminder(abandonment.customerEmail, abandonment.cart, stage);
        this.logger.log(`Sent abandonment reminder stage ${stage} to ${abandonment.customerEmail}`);
      }

      // Update Record
      abandonment.status = nextStatus;
      if (nextReminderDelay > 0) {
        abandonment.nextReminderAt = new Date(Date.now() + nextReminderDelay * 60 * 60 * 1000);
      } else {
        abandonment.nextReminderAt = null as any; // No more reminders
      }

      await this.abandonmentRepository.save(abandonment);
    }
  }

  /**
   * Stage 3: Clear Stale Carts (> 7 days)
   */
  private async clearStaleCarts() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const expiredAbandonments = await this.abandonmentRepository.find({
      where: {
        createdAt: LessThan(sevenDaysAgo),
        isRecovered: false,
        // Ensure we don't clear recently active?
        // Rely on abandonment date
      },
      relations: ['cart']
    });

    for (const abandonment of expiredAbandonments) {
      if (!abandonment.cart) continue;

      await this.cartService.clearCart(abandonment.cart.userId, abandonment.cart.sessionId || undefined);

      abandonment.status = 'EXPIRED';
      await this.abandonmentRepository.save(abandonment);

      this.logger.log(`Cleared stale cart ${abandonment.cartId} after 7 days`);
    }
  }
}
