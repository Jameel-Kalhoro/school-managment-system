import { Module } from '@nestjs/common';
import { TeacherAccessModule } from '../teacher-access/teacher-access.module';
import { GradesAdminController } from './grades.admin.controller';
import { GradesService } from './grades.service';
import { GradesTeacherController } from './grades.teacher.controller';

@Module({
  imports: [TeacherAccessModule],
  controllers: [GradesTeacherController, GradesAdminController],
  providers: [GradesService],
})
export class GradesModule {}
