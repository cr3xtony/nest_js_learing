import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from '../src/auth/dto/auth.dto';
describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    await app.init();
    app.listen(3333);
    prisma = app.get(PrismaService);
    await prisma.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3333/');
  });
  afterAll(() => {
    app.close();
  });
  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test12@gmail.com',
      password: '123456',
    };
    describe('Signup', () => {
      it('shoud throw error if not a email', () => {
        pactum
          .spec()
          .post('/auth/signup')
          .withJson({
            email: 'test12',
            password: '123456',
          })
          .expectStatus(400)
          .expectJson({
            statusCode: 400,
            message: ['email must be an email'],
            error: 'Bad Request',
          })
          .toss();
      });
      it('should throw error if email empty', () => {
        pactum
          .spec()
          .post('auth/signup')
          .withJson({
            password: '123456',
          })
          .expectStatus(400)
          .expectJson({
            statusCode: 400,
            message: ['email should not be empty', 'email must be an email'],
            error: 'Bad Request',
          })
          .toss();
      });
      it('should signup a user', () => {
        return pactum
          .spec()
          .post('auth/signup')
          .withJson(dto)
          .expectStatus(201);
      });
      it('should throw error if same email is used', () => {
        pactum
          .spec()
          .post('/auth/signup')
          .withJson(dto)
          .expectStatus(403)
          .expectJson({
            statusCode: 403,
            message: 'User already exists',
            error: 'Forbidden',
          })
          .toss();
      });
    });
    describe('Signin', () => {
      it('should signin a user', () => {
        return pactum
          .spec()
          .post('auth/signin')
          .withJson(dto)
          .expectStatus(200)
          .stores('userAt', 'access_token');
      });
    });
  });
  describe('Users', () => {
    describe('Get me', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .get('users/me')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`,
          })
          .expectStatus(200)
          .inspect();
      });
    });
    describe('Edit user', () => {});
  });
  describe('Bookmarks', () => {
    describe('Get bookmarks', () => {});
    describe('Create bookmark', () => {});
    describe('Get bookmark by id', () => {});
    describe('Edit bookmark', () => {});
    describe('Delete bookmark', () => {});
  });
});
