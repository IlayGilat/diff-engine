import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/bootstrap/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });

  const port = Number(process.env.PORT ?? 3334);
  await app.listen(port);

  Logger.log(`Mock external API listening on http://localhost:${port}`);
}

void bootstrap();
