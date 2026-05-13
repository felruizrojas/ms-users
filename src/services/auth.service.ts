// Este archivo ya no contiene llamadas HTTP a ms-auth.
// La sincronización de credenciales ocurre de forma asíncrona vía eventos Redis/Bull
// emitidos desde ms-users/src/events/event-emitter.service.ts.
//
// Las funciones que existían aquí (crearCredenciales, actualizarRol,
// desactivarCredencial, eliminarCredencial) han sido eliminadas.
// UserFactory.ts y user.service.ts ahora emiten eventos directamente.
export {};
