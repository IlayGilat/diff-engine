import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { isDemoPollingDomain } from '@org/models';
import { MockDataService } from './mock-data.service';

@Controller()
export class AppController {
  constructor(private readonly mockDataService: MockDataService) {}

  @Get('data/:domain')
  getData(@Param('domain') domain?: string, @Query('email') email?: string) {
    const sanitizedEmail = email?.trim().toLowerCase();
    if (!sanitizedEmail) {
      throw new BadRequestException('Query parameter "email" is required.');
    }

    if (!domain || !isDemoPollingDomain(domain)) {
      throw new BadRequestException(
        'Route parameter "domain" must be one of: overview, activity.',
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
