import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntry } from './time-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TimeEntry])],
  providers: [TimeEntriesService],
  controllers: [TimeEntriesController],
})
export class TimeEntriesModule {}
