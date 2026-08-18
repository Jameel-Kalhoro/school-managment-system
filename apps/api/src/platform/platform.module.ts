import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';

@Module({
  controllers: [PlansController, SchoolsController],
  providers: [PlansService, SchoolsService],
})
export class PlatformModule {}
