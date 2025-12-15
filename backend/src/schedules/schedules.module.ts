import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Schedule } from './schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule])],
  providers: [SchedulesService],
  controllers: [SchedulesController],
})
export class SchedulesModule {}
