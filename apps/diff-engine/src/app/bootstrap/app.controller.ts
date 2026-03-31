import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      service: 'diff-engine',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
