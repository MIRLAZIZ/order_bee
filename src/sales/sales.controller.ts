import { Controller, Get, Post, Body, Param, Req, Query, ParseIntPipe } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleBulkDto, CreateSaleDto } from './dto/create-sale.dto';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) { }

  @Post()
  @Roles(Role.Cashier, Role.Client)
  create(@Body() createSaleDto: CreateSaleBulkDto, @Req() req: any) {
    const userId = req['user'].id;
    return this.salesService.create(createSaleDto.sales, userId);
  }

  @Get()
  findAll(@Req() req: any, @Query('page') page: number) {
    return this.salesService.findAll(req['user'].id, Number(page || 1));
  }


  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.salesService.findOne(+id, req['user'].id);
  }


  @Post('cancel/:id')
  cancelSale(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() data: { reason?: string }) {
    return this.salesService.cancelSale(+id, req['user'].id, data?.reason);
  }



}
