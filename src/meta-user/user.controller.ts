import { Controller, Get, Post, Body, Delete, Param, ParseIntPipe, Put, UseGuards, Req, Query } from '@nestjs/common';
import { UserService } from './user.service';
import UserDto from './dto/user.dto';
import ChangePasswordDto from './dto/password.dto';
import { RolesGuard } from 'common/guards/roles.guard';
import { Role } from 'common/enums/role.enum';
import { Roles } from 'common/decorators/roles.decorator';
 
@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @Roles(Role.Admin, Role.Agent, Role.Client)
  create(@Body() data: UserDto, @Req() req) {
    // data._role = req.user.role
    // console.log(data, req.user.role);
    
    
    
    return this.userService.create(data, req.user.id, req.user.role);
  }

  @Get()
  @Roles(Role.Admin, Role.Agent, Role.Client)
  findAll(@Req() req) {
    
    const role = req.user.role
    const createdById = req.user.id
    console.log(role, createdById);
    
    return this.userService.findAll(createdById, role);
    
  }


  @Get(':id')
  @Roles(Role.Admin)
  findOne(@Param('id') id: string) {
    
    return this.userService.findOne(+id); // stringni numberga aylantiramiz
  }


  @Delete(':id')
  @Roles(Role.Admin)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.delete(id);
    return { success: true, message: `Foydalanuvchi ${id} muvaffaqiyatli o‘chirildi` };;
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Client)
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<UserDto>) {

    return this.userService.update(id, data);
  }

  @Roles(Role.Admin, Role.Client)
  @Put('change-password/:id')
  async changePassword(@Param('id', ParseIntPipe) id: number, @Body() changePasswordDto: ChangePasswordDto) {
    await this.userService.changePassword(id, changePasswordDto);
    return { success: true, message: `Foydalaniuvchi parol muvaffaqiyatli o‘zgartirildi ` };
  }
}
