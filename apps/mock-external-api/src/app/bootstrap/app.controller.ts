import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { isDemoMapLayerDomain } from '@org/models';
import { MockDataService } from '../features/demo-map-data/services/mock-data.service';

@Controller()
export class AppController {
  constructor(private readonly mockDataService: MockDataService) {}

  @Get('data/:domain')
  getData(@Param('domain') domain?: string, @Query('email') email?: string) {
    const sanitizedEmail = email?.trim().toLowerCase();
    if (!sanitizedEmail) {
      throw new BadRequestException('Query parameter "email" is required.');
    }

    if (!domain || !isDemoMapLayerDomain(domain)) {
      throw new BadRequestException(
        'Route parameter "domain" must be one of: regions, hotspots.',
      );
    }

    return this.mockDataService.getData(sanitizedEmail, domain);
  }

  @Get('health')
  getHealth() {
    return {
      service: 'mock-external-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
