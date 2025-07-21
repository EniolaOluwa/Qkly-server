import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, TransactionStatus } from './order.entity';
import { Product } from './product.entity';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  // Order methods
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order = this.orderRepository.create(orderData);
    return await this.orderRepository.save(order);
  }

  async findAllOrders(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['user', 'business', 'product'],
    });
  }

  async findOrderById(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'business', 'product'],
    });
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return order;
  }

  async findOrdersByUserId(userId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['user', 'business', 'product'],
    });
  }

  async findOrdersByBusinessId(businessId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { businessId },
      relations: ['user', 'business', 'product'],
    });
  }

  async updateOrderStatus(id: number, orderStatus: OrderStatus): Promise<Order> {
    const order = await this.findOrderById(id);
    order.orderStatus = orderStatus;
    return await this.orderRepository.save(order);
  }

  async updateTransactionStatus(id: number, transactionStatus: TransactionStatus): Promise<Order> {
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

  // Product methods
  async createProduct(productData: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(productData);
    return await this.productRepository.save(product);
  }

  async findAllProducts(): Promise<Product[]> {
    return await this.productRepository.find({
      relations: ['user', 'business'],
    });
  }

  async findProductById(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['user', 'business'],
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }

  async findProductsByUserId(userId: number): Promise<Product[]> {
    return await this.productRepository.find({
      where: { userId },
      relations: ['user', 'business'],
    });
  }

  async findProductsByBusinessId(businessId: number): Promise<Product[]> {
    return await this.productRepository.find({
      where: { businessId },
      relations: ['user', 'business'],
    });
  }

  async updateProduct(id: number, updateData: Partial<Product>): Promise<Product> {
    const product = await this.findProductById(id);
    Object.assign(product, updateData);
    return await this.productRepository.save(product);
  }

  async deleteProduct(id: number): Promise<void> {
    const product = await this.findProductById(id);
    await this.productRepository.remove(product);
  }
} 