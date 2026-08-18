import { Module } from '@nestjs/common';
import { TeacherAccessModule } from '../teacher-access/teacher-access.module';
import { TeacherPortalController } from './teacher-portal.controller';
import { TeacherPortalService } from './teacher-portal.service';

@Module({
  imports: [TeacherAccessModule],
  controllers: [TeacherPortalController],
  providers: [TeacherPortalService],
})
export class TeacherPortalModule {}
