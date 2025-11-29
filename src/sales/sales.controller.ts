import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleBulkDto, CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(Role.Cashier, Role.Client)
  create(@Body() createSaleDto: CreateSaleBulkDto, @Req() req: any) {
    const userId = req['user'].id;
    return this.salesService.create(createSaleDto.sales, userId);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.salesService.findAll(req['user'].id); 
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(+id, updateSaleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesService.remove(+id);
  }
}
