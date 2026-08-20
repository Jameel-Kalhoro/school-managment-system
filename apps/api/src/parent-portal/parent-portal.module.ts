import { Module } from '@nestjs/common';
import { ParentAccessService } from './parent-access.service';
import { ParentPortalController } from './parent-portal.controller';
import { ParentPortalService } from './parent-portal.service';

@Module({
  controllers: [ParentPortalController],
  providers: [ParentPortalService, ParentAccessService],
})
export class ParentPortalModule {}
