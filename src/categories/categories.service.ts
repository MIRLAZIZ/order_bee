import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>
  ) { }
  create(data: CreateCategoryDto): Promise<Category> {
    return this.categoryRepository.save(data);
  }

  findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  findOne(id: number): Promise<Category | null> {
    return this.categoryRepository.findOne({ where: { id } });
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  // async remove(id: number) {
  //   try {
  //     const result = await this.categoryRepository.delete(id);

  //     if (result.affected === 0) { throw new NotFoundException('Categorya topilmadiiii') }
  //     return { success: true, message: 'Category muvaffaqiyatli o\'chirildi' }
  //   } catch (error) {
  //     console.log(error);
      

  //     if (error.code === '23503') throw new NotFoundException('Categorya topilmadi');
  //     if (error.code === "ER_ROW_IS_REFERENCED_2") { throw new NotFoundException('Bu categoriyani o\'chirish mumkin emas. Unga tegishli productlar mavjud.'); }
  //     return   error

  //   }

  // }
  async remove(id: number) {
  const result = await this.categoryRepository
    .delete(id)
    .catch((error) => {
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23503') {
        throw new BadRequestException('Bu categoriyani o‘chirish mumkin emas. Unga tegishli productlar mavjud.');
      }
      throw error;
    });

  if (result.affected === 0) {
    throw new NotFoundException('Category topilmadi');
  }

  return { success: true, message: 'Category muvaffaqiyatli o\'chirildi' };
}

}
