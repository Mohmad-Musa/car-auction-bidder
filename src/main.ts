import { NestFactory } from '@nestjs/core';
import { WsExceptionFilter } from './common/filters/ws-exception.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.HTTP_PORT || 3001);
  console.log(`HTTP on ${process.env.PORT}, WS on ${process.env.WS_PORT}`);
}
bootstrap();
