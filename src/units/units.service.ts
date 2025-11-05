import { BadRequestException, Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>) {

  }
async create(createUnitDto: CreateUnitDto, userId: number): Promise<Unit> {
  try {
    const unit = this.unitRepository.create({
      ...createUnitDto,
      user: { id: userId },
    });

    return await this.unitRepository.save(unit);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new ConflictException('Bu nomdagi unit allaqachon mavjud!');
    }

    throw new InternalServerErrorException( 'unitni saqlashda xatolik yuz berdi');

    
   
  }
}


  async findAll( userId): Promise<Unit[]> {
    return await this.unitRepository.find({
      where : { user: { id: userId } },
      order: { id: 'DESC' },
    })
      ;
  }

  async findOne(id: number): Promise<Unit> {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) {
      throw new BadRequestException('id not found')
    }
    return unit;
  }

  async update(id: number, createUnitDto: UpdateUnitDto): Promise<UpdateResult> {
   

    try {
      const unit = await this.unitRepository.update(id, createUnitDto)

    return unit
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Bu nomdagi unit allaqachon mavjud!');
      }
  
      throw new InternalServerErrorException( 'unitni saqlashda xatolik yuz berdi');
    }
    }


  async remove(id: number): Promise<DeleteResult> {
    return await this.unitRepository.delete(id)
  }
}
