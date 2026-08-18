import { Module } from '@nestjs/common';
import { TeacherAccessService } from './teacher-access.service';

@Module({
  providers: [TeacherAccessService],
  exports: [TeacherAccessService],
})
export class TeacherAccessModule {}
