import { Module } from '@nestjs/common';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearsService } from './academic-years.service';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

@Module({
  controllers: [SchoolController, AcademicYearsController],
  providers: [SchoolService, AcademicYearsService],
})
export class SchoolModule {}
