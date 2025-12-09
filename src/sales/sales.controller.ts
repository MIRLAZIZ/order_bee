import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query } from '@nestjs/common';
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


    // STATISTICS
    @Get('statistics')
    getStatistics(
      @Req() req: any,
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string
    ) {
      console.log(startDate, endDate, "statistic ishladi");
      
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      // return  `${start} ${end}`
      return this.salesService.getStatistics(req['user'].id, start, end);
    }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.salesService.findOne(+id, req['user'].id);
  }
// UPDATE
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSaleDto: CreateSaleDto,
    @Req() req: any
  ) {
    return this.salesService.update(+id, updateSaleDto, req['user'].id);
  }

  // DELETE
  @Delete(':id')
  remove(
    @Param('id') id: string, @Req() req: any
  ) {
    return this.salesService.remove(+id, req['user'].id);
  }

  
}
