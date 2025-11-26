import { Controller, Post, Body, Get, Param, ParseIntPipe, Put, Delete, UseGuards } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { Public } from "../../common/decorators/public.decorator";
import { Admin } from "../../common/decorators/admin.decorator";
import { RoleGuard } from "../users";
import { ApiBearerAuth } from "@nestjs/swagger";



@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  // only admin can create categories
  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Post()
  create(@Body() createDto: CreateCategoryDto) {
    return this.categoryService.create(createDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }


  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }


  // only admin can update category
 
  @UseGuards(RoleGuard)
  @Admin()
  @Put(':id')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateDto);
  }


  // only admin can delete categories
 
  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
