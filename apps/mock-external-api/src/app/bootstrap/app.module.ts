import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DemoMapFeatureFactory } from '../features/demo-map-data/factories/demo-map-feature.factory';
import { DemoMapRandomFactory } from '../features/demo-map-data/factories/demo-map-random.factory';
import { MockDataService } from '../features/demo-map-data/services/mock-data.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [DemoMapFeatureFactory, DemoMapRandomFactory, MockDataService],
})
export class AppModule {}
