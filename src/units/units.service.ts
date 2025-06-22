import { BadRequestException, Injectable } from '@nestjs/common';
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
  async create(createUnitDto: CreateUnitDto): Promise<Unit> {
    const existingUnit = await this.unitRepository.findOne({ where: { name: createUnitDto.name } })
    if (existingUnit) {
      throw new BadRequestException('Unit already exists')

    }
    const unit = this.unitRepository.create(createUnitDto)
    return this.unitRepository.save(unit)

  }


  async findAll(): Promise<Unit[]> {
    return await this.unitRepository.find()
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
    const existingUnit = await this.unitRepository.findOne({ where: { name: createUnitDto.name } })
    if (existingUnit) {
      throw new BadRequestException('Unit already exists')

    }
    
    const unit = this.unitRepository.update(id, createUnitDto)

    return unit
  }

  async remove(id: number): Promise<DeleteResult> {
    return await this.unitRepository.delete(id)
  }
}
