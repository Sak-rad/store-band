import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: number, @CurrentUser('role') role: string) {
    return this.bookingsService.findAll(userId, role);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.bookingsService.findOne(id, userId);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser('id') userId: number, @Req() req: Request) {
    return this.bookingsService.create(dto, userId, (req as any).locale || 'en');
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body('status') status: string, @Req() req: Request) {
    return this.bookingsService.update(id, status, (req as any).locale || 'en');
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') userId: number) {
    return this.bookingsService.remove(id, userId);
  }
}
