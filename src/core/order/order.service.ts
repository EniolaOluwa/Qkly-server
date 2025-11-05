import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/entity/order.entity';
import { OrderStatus, TransactionStatus } from './interfaces/order.interface';


@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}


 // Order methods
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order = this.orderRepository.create(orderData);
    return await this.orderRepository.save(order);
  }

  async findAllOrders(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['user', 'business'],
    });
  }

  async findOrderById(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'business'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findOrdersByUserId(userId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['user', 'business'],
    });
  }

  async findOrdersByBusinessId(businessId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { businessId },
      relations: ['user', 'business'],
    });
  }

  async updateOrderStatus(
    id: number,
    orderStatus: OrderStatus,
  ): Promise<Order> {
    const order = await this.findOrderById(id);
    order.orderStatus = orderStatus;
    return await this.orderRepository.save(order);
  }

  async updateTransactionStatus(
    id: number,
    transactionStatus: TransactionStatus,
  ): Promise<Order> {
    const order = await this.findOrderById(id);
    order.transactionStatus = transactionStatus;
    return await this.orderRepository.save(order);
  }

  async updateOrder(id: number, updateData: Partial<Order>): Promise<Order> {
    const order = await this.findOrderById(id);
    Object.assign(order, updateData);
    return await this.orderRepository.save(order);
  }

  async deleteOrder(id: number): Promise<void> {
    const order = await this.findOrderById(id);
    await this.orderRepository.remove(order);
  }
}