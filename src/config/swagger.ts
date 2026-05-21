import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MS-Users — Sanos y Salvos',
      version: '2.0.0',
      description: 'Microservicio de gestión de usuarios: registro de ciudadanos e instituciones, perfil, gestión de contraseñas (cambio y recuperación por OTP) y administración. Fuente de verdad de los datos del usuario.',
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: process.env.NODE_ENV === 'production'
    ? ['./dist/routes/*.js']
    : ['./src/routes/*.ts'],
};

export default swaggerJsdoc(options);