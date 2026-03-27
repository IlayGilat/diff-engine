import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MockDataService } from './mock-data.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [MockDataService],
})
export class AppModule {}
