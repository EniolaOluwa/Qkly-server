import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { RoleGuard } from "../users";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { count } from "console";
import { HttpResponse } from "../../common/utils/http-response.utils";


@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Post()
  async create(@Body() createDto: CreateCategoryDto) {
    const data = await this.categoryService.create(createDto);

    return HttpResponse.success({
      data,
      message: 'Category Created successfully',
    });
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


  @UseGuards(RoleGuard)
  @Admin()
  @Put(':id')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateDto);
  }


  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
