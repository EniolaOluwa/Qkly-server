import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entity/product.entity';
import { User } from '../users';
import { Business } from '../businesses/business.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateOrderDto } from '../order/dto/update-order.dto';
import { AppResponse } from '../../common/app.response';


@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>
  ) {}


  // Product methods
  async createProduct(productData: CreateProductDto): Promise<Product> {
    try {
       const userExists = await this.userRepository.findOne({ where: { id: productData.userId } });
        if (!userExists) {
          throw new BadRequestException('User does not exist.');
        }

    const businessExists = await this.businessRepository.findOne({ where: { id: productData.businessId } });
    if (!businessExists) {
      throw new BadRequestException('Business does not exist.');
    }
      if (productData.hasVariation) {
        const hasSizes = productData.sizes && productData.sizes.length > 0;
        const hasColors = productData.colors && productData.colors.length > 0;

        if (!hasSizes && !hasColors) {
          throw new BadRequestException(
            'Product marked as having variations must include at least one size or color.',
          );
        }
      }
      const product = this.productRepository.create(productData);
      return await this.productRepository.save(product);
    } catch (error) {
      error.location = `ProductService.${this.createProduct.name} method`;
      AppResponse.error(error);
      throw error
    }
  }


  async findAllProducts(): Promise<Product[]> {
    try {
      return await this.productRepository.find({
        relations: ['user', 'business', 'sizes'],
      });
    } catch (error) {
      error.location = `ProductService.${this.findAllProducts.name} method`;
      AppResponse.error(error);
      throw error
    }
  }

  
  async findProductById(id: number): Promise<Product> {
    try{
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['user', 'business'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  } catch(error){
      error.location = `ProductService.${this.findProductById.name} method`;
      AppResponse.error(error);
      throw error
  }
  }


  async findProductsByUserId(userId: number): Promise<Product[]> {
    try{
    return await this.productRepository.find({
      where: { userId },
      relations: ['user', 'business'],
    });
  } catch(error){
    error.location = `ProductService.${this.findProductsByUserId.name} method`;
      AppResponse.error(error);
      throw error
  }
  }



  async findProductsByBusinessId(businessId: number): Promise<Product[]> {
    try{
    return await this.productRepository.find({
      where: { businessId },
      relations: ['user', 'business'],
    });
  } catch(error){
    error.location = `ProductService.${this.findProductsByBusinessId.name} method`;
      AppResponse.error(error);
      throw error
  }
  }



  async updateProduct(
    id: number,
    updateData: UpdateOrderDto,
  ): Promise<Product> {
    try {
      const product = await this.findProductById(id);
      Object.assign(product, updateData);
      return await this.productRepository.save(product);
    } catch (error) {
      error.location = `ProductService.${this.updateProduct.name} method`;
      AppResponse.error(error);
      throw error
    }
  }



  async deleteProduct(id: number): Promise<void> {
    try {
      const product = await this.findProductById(id);
      await this.productRepository.remove(product);
    } catch (error) {
      error.location = `ProductService.${this.deleteProduct.name} method`;
      AppResponse.error(error);
      throw error
    }
  }
}