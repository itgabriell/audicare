// CQRS (Command Query Responsibility Segregation) Pattern
// Separa operações de leitura (Queries) de operações de escrita (Commands)

import { supabase } from '@/lib/customSupabaseClient';

// Base classes para CQRS
export class Command {
  constructor(data = {}) {
    this.data = data;
    this.timestamp = new Date();
    this.id = crypto.randomUUID();
  }
}

export class Query {
  constructor(params = {}) {
    this.params = params;
    this.timestamp = new Date();
  }
}

export class CommandResult {
  constructor(success, data = null, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timestamp = new Date();
  }
}

export class QueryResult {
  constructor(data = null, error = null, metadata = {}) {
    this.data = data;
    this.error = error;
    this.metadata = metadata;
    this.timestamp = new Date();
  }
}

// Command Handlers - Operações de escrita
export class CommandBus {
  constructor() {
    this.handlers = new Map();
  }

  register(commandType, handler) {
    this.handlers.set(commandType, handler);
  }

  async execute(command) {
    const handler = this.handlers.get(command.constructor.name);

    if (!handler) {
      throw new Error(`Handler não encontrado para comando: ${command.constructor.name}`);
    }

    try {
      console.log(`[CQRS] Executando comando: ${command.constructor.name}`, command.id);
      const result = await handler.handle(command);

      if (result instanceof CommandResult) {
        return result;
      }

      // Wrap result in CommandResult
      return new CommandResult(true, result);
    } catch (error) {
      console.error(`[CQRS] Erro no comando ${command.constructor.name}:`, error);
      return new CommandResult(false, null, error);
    }
  }
}

// Query Handlers - Operações de leitura
export class QueryBus {
  constructor() {
    this.handlers = new Map();
  }

  register(queryType, handler) {
    this.handlers.set(queryType, handler);
  }

  async execute(query) {
    const handler = this.handlers.get(query.constructor.name);

    if (!handler) {
      throw new Error(`Handler não encontrado para query: ${query.constructor.name}`);
    }

    try {
      console.log(`[CQRS] Executando query: ${query.constructor.name}`);
      const result = await handler.handle(query);

      if (result instanceof QueryResult) {
        return result;
      }

      // Wrap result in QueryResult
      return new QueryResult(result);
    } catch (error) {
      console.error(`[CQRS] Erro na query ${query.constructor.name}:`, error);
      return new QueryResult(null, error);
    }
  }
}

// Instâncias globais
export const commandBus = new CommandBus();
export const queryBus = new QueryBus();

// ==================== COMMANDS ====================

// Patient Commands
export class CreatePatientCommand extends Command {
  constructor(patientData) {
    super({ patientData });
  }
}

export class UpdatePatientCommand extends Command {
  constructor(patientId, updates) {
    super({ patientId, updates });
  }
}

export class DeletePatientCommand extends Command {
  constructor(patientId) {
    super({ patientId });
  }
}

// Message Commands
export class SendMessageCommand extends Command {
  constructor(messageData) {
    super({ messageData });
  }
}

export class MarkAsReadCommand extends Command {
  constructor(conversationId) {
    super({ conversationId });
  }
}

// Appointment Commands
export class CreateAppointmentCommand extends Command {
  constructor(appointmentData) {
    super({ appointmentData });
  }
}

export class UpdateAppointmentCommand extends Command {
  constructor(appointmentId, updates) {
    super({ appointmentId, updates });
  }
}

// Notification Commands
export class CreateNotificationCommand extends Command {
  constructor(notificationData) {
    super({ notificationData });
  }
}

export class MarkNotificationAsReadCommand extends Command {
  constructor(notificationId) {
    super({ notificationId });
  }
}

export class MarkAllNotificationsAsReadCommand extends Command {
  constructor(userId) {
    super({ userId });
  }
}

// ==================== QUERIES ====================

// Patient Queries
export class GetPatientsQuery extends Query {
  constructor(filters = {}) {
    super({ filters });
  }
}

export class GetPatientByIdQuery extends Query {
  constructor(patientId) {
    super({ patientId });
  }
}

// Appointment Queries
export class GetAppointmentsQuery extends Query {
  constructor(filters = {}) {
    super({ filters });
  }
}

// Notification Queries
export class GetNotificationsQuery extends Query {
  constructor(userId, pagination = {}) {
    super({ userId, pagination });
  }
}

export class GetUnreadNotificationCountQuery extends Query {
  constructor(userId) {
    super({ userId });
  }
}

// ==================== COMMAND HANDLERS ====================

// Patient Command Handlers
class CreatePatientCommandHandler {
  async handle(command) {
    const { patientData } = command.data;
    const { addPatient } = await import('@/database');

    const result = await addPatient(patientData);
    return new CommandResult(true, result);
  }
}

class UpdatePatientCommandHandler {
  async handle(command) {
    const { patientId, updates } = command.data;
    const { updatePatient } = await import('@/database');

    const result = await updatePatient(patientId, updates);
    return new CommandResult(true, result);
  }
}

class DeletePatientCommandHandler {
  async handle(command) {
    const { patientId } = command.data;
    const { deletePatient } = await import('@/database');

    await deletePatient(patientId);
    return new CommandResult(true);
  }
}

// Message Command Handlers
class SendMessageCommandHandler {
  async handle(command) {
    const { messageData } = command.data;
    // Handler será implementado no useChatSending.js
    throw new Error('SendMessageCommandHandler deve ser implementado no hook useChatSending');
  }
}

class MarkAsReadCommandHandler {
  async handle(command) {
    const { conversationId } = command.data;
    const { supabase } = await import('@/lib/customSupabaseClient');

    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (error) throw error;
    return new CommandResult(true);
  }
}

// Appointment Command Handlers
class CreateAppointmentCommandHandler {
  async handle(command) {
    const { appointmentData } = command.data;
    const { addAppointment } = await import('@/database');

    const result = await addAppointment(appointmentData);
    return new CommandResult(true, result);
  }
}

class UpdateAppointmentCommandHandler {
  async handle(command) {
    const { appointmentId, updates } = command.data;
    const { updateAppointment } = await import('@/database');

    const result = await updateAppointment(appointmentId, updates);
    return new CommandResult(true, result);
  }
}

// Notification Command Handlers
class CreateNotificationCommandHandler {
  async handle(command) {
    const { notificationData } = command.data;
    const { createNotification } = await import('@/database');

    const result = await createNotification(notificationData);
    return new CommandResult(true, result);
  }
}

class MarkNotificationAsReadCommandHandler {
  async handle(command) {
    const { notificationId } = command.data;
    const { markNotificationAsRead } = await import('@/database');

    const result = await markNotificationAsRead(notificationId);
    return new CommandResult(true, result);
  }
}

class MarkAllNotificationsAsReadCommandHandler {
  async handle(command) {
    const { userId } = command.data;
    const { markAllNotificationsAsRead } = await import('@/database');

    const result = await markAllNotificationsAsRead(userId);
    return new CommandResult(true, result);
  }
}

// ==================== QUERY HANDLERS ====================

// Patient Query Handlers
class GetPatientsQueryHandler {
  async handle(query) {
    const { filters } = query.params;
    const { getPatients } = await import('@/database');

    const result = await getPatients(
      filters.page || 1,
      filters.pageSize || 10,
      filters.searchTerm || '',
      filters.sortBy || 'created_at',
      filters.sortOrder || 'desc'
    );

    return new QueryResult(result, null, {
      totalCount: result.count,
      page: filters.page || 1,
      pageSize: filters.pageSize || 10,
    });
  }
}

class GetPatientByIdQueryHandler {
  async handle(query) {
    const { patientId } = query.params;
    const { getPatientById } = await import('@/database');

    const result = await getPatientById(patientId);
    return new QueryResult(result);
  }
}

// Appointment Query Handlers
class GetAppointmentsQueryHandler {
  async handle(query) {
    const { filters } = query.params;
    const { getAppointments } = await import('@/database');

    const result = await getAppointments(filters);
    return new QueryResult(result);
  }
}

// Notification Query Handlers
class GetNotificationsQueryHandler {
  async handle(query) {
    const { userId, pagination } = query.params;
    const { getNotificationsForUser } = await import('@/database');

    const result = await getNotificationsForUser(
      userId,
      pagination.limit || 50,
      pagination.offset || 0
    );

    return new QueryResult(result, null, {
      hasMore: result.length === (pagination.limit || 50),
      totalLoaded: (pagination.offset || 0) + result.length,
    });
  }
}

class GetUnreadNotificationCountQueryHandler {
  async handle(query) {
    const { userId } = query.params;
    const { getUnreadNotificationCount } = await import('@/database');

    const result = await getUnreadNotificationCount(userId);
    return new QueryResult(result);
  }
}

// Registrar todos os handlers
commandBus.register('CreatePatientCommand', new CreatePatientCommandHandler());
commandBus.register('UpdatePatientCommand', new UpdatePatientCommandHandler());
commandBus.register('DeletePatientCommand', new DeletePatientCommandHandler());

commandBus.register('SendMessageCommand', new SendMessageCommandHandler());
commandBus.register('MarkAsReadCommand', new MarkAsReadCommandHandler());

commandBus.register('CreateAppointmentCommand', new CreateAppointmentCommandHandler());
commandBus.register('UpdateAppointmentCommand', new UpdateAppointmentCommandHandler());

commandBus.register('CreateNotificationCommand', new CreateNotificationCommandHandler());
commandBus.register('MarkNotificationAsReadCommand', new MarkNotificationAsReadCommandHandler());
commandBus.register('MarkAllNotificationsAsReadCommand', new MarkAllNotificationsAsReadCommandHandler());

queryBus.register('GetPatientsQuery', new GetPatientsQueryHandler());
queryBus.register('GetPatientByIdQuery', new GetPatientByIdQueryHandler());

queryBus.register('GetAppointmentsQuery', new GetAppointmentsQueryHandler());

queryBus.register('GetNotificationsQuery', new GetNotificationsQueryHandler());
queryBus.register('GetUnreadNotificationCountQuery', new GetUnreadNotificationCountQueryHandler());

// Hooks React para CQRS
export function useCommand(commandClass) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const execute = React.useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const command = new commandClass(data);
      const result = await commandBus.execute(command);

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [commandClass]);

  return { execute, loading, error };
}

export function useQuery(queryClass) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [data, setData] = React.useState(null);

  const execute = React.useCallback(async (params) => {
    setLoading(true);
    setError(null);

    try {
      const query = new queryClass(params);
      const result = await queryBus.execute(query);

      if (result.error) {
        throw result.error;
      }

      setData(result.data);
      return result.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [queryClass]);

  return { execute, loading, error, data };
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.CQRS = {
    commandBus,
    queryBus,
    commands: () => Array.from(commandBus.handlers.keys()),
    queries: () => Array.from(queryBus.handlers.keys()),
    executeCommand: (commandName, data) => {
      // Permite executar comandos diretamente no console
      const commandClasses = {
        CreatePatientCommand,
        UpdatePatientCommand,
        DeletePatientCommand,
        CreateAppointmentCommand,
        UpdateAppointmentCommand,
        CreateNotificationCommand,
        MarkNotificationAsReadCommand,
        MarkAllNotificationsAsReadCommand,
      };

      const CommandClass = commandClasses[commandName];
      if (!CommandClass) {
        throw new Error(`Comando não encontrado: ${commandName}`);
      }

      return commandBus.execute(new CommandClass(data));
    },
    executeQuery: (queryName, params) => {
      // Permite executar queries diretamente no console
      const queryClasses = {
        GetPatientsQuery,
        GetPatientByIdQuery,
        GetAppointmentsQuery,
        GetNotificationsQuery,
        GetUnreadNotificationCountQuery,
      };

      const QueryClass = queryClasses[queryName];
      if (!QueryClass) {
        throw new Error(`Query não encontrada: ${queryName}`);
      }

      return queryBus.execute(new QueryClass(params));
    },
  };
}
