import { Module } from '@nestjs/common';
import { TeacherAccessModule } from '../teacher-access/teacher-access.module';
import { AssignmentsAdminController } from './assignments.admin.controller';
import { AssignmentsService } from './assignments.service';
import { AssignmentsTeacherController } from './assignments.teacher.controller';

@Module({
  imports: [TeacherAccessModule],
  controllers: [AssignmentsTeacherController, AssignmentsAdminController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
