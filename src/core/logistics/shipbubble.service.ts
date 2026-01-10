import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { createHmac } from 'crypto';
import { OrderShipment } from '../order/entity/order-shipment.entity';
import { OrderService } from '../order/order.service';
import { OrderStatus } from '../../common/enums/order.enum';
import { CreateLabelDto, FetchRatesDto, ValidateAddressDto } from './dto/shipbubble.dto';
import {
  AddressCodeData,
  LabelResponseData,
  PackageCategory,
  RatesResponseData,
  ShipBubbleResponse
} from './interfaces/shipbubble.interface';

@Injectable()
export class ShipBubbleService {
  private readonly logger = new Logger(ShipBubbleService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(OrderShipment)
    private readonly orderShipmentRepository: Repository<OrderShipment>,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {
    this.baseUrl = this.configService.get<string>('SHIPBUBLE_BASE_URL', 'https://api.shipbubble.com/v1');
    this.apiKey = this.configService.get<string>('SHIPBUBBLE_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('SHIPBUBBLE_API_KEY is not configured');
    }
  }

  /**
   * Task 3: Standardized HTTP Client with Bearer Auth & Error Logging
   */
  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(method: 'get' | 'post', url: string, data?: any): Promise<T> {
    try {
      const fullUrl = `${this.baseUrl}${url}`;
      this.logger.debug(`ShipBubble Request: ${method.toUpperCase()} ${fullUrl}`);

      const response = await firstValueFrom(
        method === 'get'
          ? this.httpService.get<ShipBubbleResponse<T>>(fullUrl, { headers: this.getHeaders() })
          : this.httpService.post<ShipBubbleResponse<T>>(fullUrl, data, { headers: this.getHeaders() })
      );

      return response.data.data;
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      this.logger.error(
        `ShipBubble API Error [${status}]: ${JSON.stringify(errorData || error.message)}`,
        error.stack
      );

      // Standardized error propagation
      if (status === 400) {
        throw new InternalServerErrorException(errorData?.message || 'ShipBubble Bad Request');
      }
      throw new InternalServerErrorException('Failed to communicate with ShipBubble');
    }
  }

  /**
   * Task 4: Address Management Service
   * Validates an address and returns an address_code
   */
  async validateAddress(dto: ValidateAddressDto): Promise<AddressCodeData> {
    this.logger.log(`Validating ShipBubble address for: ${dto.email}`);
    return this.request<AddressCodeData>('post', '/shipping/address/validate', dto);
  }

  /**
   * Get Package Categories (Required for rates)
   */
  async getPackageCategories(): Promise<PackageCategory[]> {
    return this.request<PackageCategory[]>('get', '/shipping/categories');
  }

  /**
   * Phase 2: Fetch Shipping Rates
   */
  async fetchRates(dto: FetchRatesDto): Promise<RatesResponseData> {
    this.logger.log(`Fetching ShipBubble rates for ${dto.items.length} items`);
    return this.request<RatesResponseData>('post', '/shipping/fetch_rates', dto);
  }

  /**
   * Phase 3: Create Shipping Label (Fulfillment)
   */
  async createLabel(dto: CreateLabelDto): Promise<LabelResponseData> {
    this.logger.log(`Creating ShipBubble label for token: ${dto.request_token}`);
    return this.request<LabelResponseData>('post', '/shipping/labels', dto);
  }

  /**
   * Phase 4: Webhook Processing & Signature Verification
   */
  validateWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.configService.get<string>('SHIPBUBBLE_WEBHOOK_SECRET');
    if (!secret) return false;

    const hash = createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }

  async processWebhook(payload: any): Promise<void> {
    const { event, data } = payload;

    if (event === 'shipment.status.changed') {
      await this.handleStatusChange(data);
    }
  }

  private async handleStatusChange(data: any): Promise<void> {
    const { shipment_id, status, tracking_number } = data;

    // Find the shipment in our DB
    // We store shipment_id in carrierMetadata
    const shipment = await this.orderShipmentRepository.createQueryBuilder('shipment')
      .where("shipment.carrierMetadata ->> 'shipment_id' = :shipment_id", { shipment_id })
      .leftJoinAndSelect('shipment.order', 'order')
      .getOne();

    if (!shipment) {
      this.logger.warn(`Webhook tracking update failed: Shipment ${shipment_id} not found`);
      return;
    }

    const oldStatus = shipment.status;
    const newStatus = this.mapShipBubbleStatus(status);

    if (oldStatus !== newStatus) {
      shipment.status = newStatus;
      await this.orderShipmentRepository.save(shipment);

      this.logger.log(`Shipment ${shipment.id} status updated: ${oldStatus} -> ${newStatus}`);

      // If delivered, update order status as well
      if (newStatus === 'DELIVERED' && shipment.order) {
        await this.orderService.updateOrderStatus(shipment.order.id, {
          status: OrderStatus.DELIVERED,
          notes: `Shipment delivered. Tracking: ${tracking_number}`
        });
      }
    }
  }

  private mapShipBubbleStatus(status: string): string {
    const mapping: Record<string, string> = {
      'label_created': 'PENDING',
      'pickup_scheduled': 'PENDING',
      'picked_up': 'PICKED_UP',
      'ready_for_dispatch': 'PICKED_UP',
      'in_transit': 'IN_TRANSIT',
      'arrived_at_destination': 'IN_TRANSIT',
      'out_for_delivery': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'delivery_failed': 'FAILED',
      'cancelled': 'CANCELLED',
    };

    return mapping[status.toLowerCase()] || status.toUpperCase();
  }
}
