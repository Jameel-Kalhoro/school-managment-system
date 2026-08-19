import { Module } from '@nestjs/common';
import { TeacherAccessModule } from '../teacher-access/teacher-access.module';
import { AttendanceAdminController } from './attendance.admin.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceTeacherController } from './attendance.teacher.controller';

@Module({
  imports: [TeacherAccessModule],
  controllers: [AttendanceTeacherController, AttendanceAdminController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
