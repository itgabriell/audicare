import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  commandBus,
  queryBus,
  CreatePatientCommand,
  UpdatePatientCommand,
  GetPatientsQuery,
  GetPatientByIdQuery
} from '../cqrs';

// Mock das funções do database
vi.mock('@/database', () => ({
  addPatient: vi.fn(),
  updatePatient: vi.fn(),
  getPatients: vi.fn(),
  getPatientById: vi.fn(),
}));

import { addPatient, updatePatient, getPatients, getPatientById } from '@/database';

describe('CQRS System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Bus', () => {
    it('should execute commands successfully', async () => {
      const mockPatient = { id: '123', name: 'João Silva' };
      addPatient.mockResolvedValue(mockPatient);

      const command = new CreatePatientCommand({
        name: 'João Silva',
        phone: '11999999999'
      });

      const result = await commandBus.execute(command);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPatient);
      expect(addPatient).toHaveBeenCalledWith({
        name: 'João Silva',
        phone: '11999999999'
      });
    });

    it('should handle command errors', async () => {
      const error = new Error('Database error');
      addPatient.mockRejectedValue(error);

      const command = new CreatePatientCommand({
        name: 'João Silva',
        phone: '11999999999'
      });

      const result = await commandBus.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should throw error for unknown commands', async () => {
      class UnknownCommand {
        constructor() {
          this.data = {};
        }
      }

      const command = new UnknownCommand();

      await expect(commandBus.execute(command)).rejects.toThrow(
        'Handler não encontrado para comando: UnknownCommand'
      );
    });
  });

  describe('Query Bus', () => {
    it('should execute queries successfully', async () => {
      const mockPatients = [
        { id: '1', name: 'João Silva' },
        { id: '2', name: 'Maria Santos' }
      ];

      const mockResult = {
        data: mockPatients,
        count: 2,
        page: 1,
        pageSize: 10
      };

      getPatients.mockResolvedValue(mockResult);

      const query = new GetPatientsQuery({
        page: 1,
        pageSize: 10,
        searchTerm: ''
      });

      const result = await queryBus.execute(query);

      expect(result.data).toEqual(mockResult);
      expect(getPatients).toHaveBeenCalledWith(1, 10, '', 'created_at', 'desc');
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      getPatients.mockRejectedValue(error);

      const query = new GetPatientsQuery({ page: 1 });

      const result = await queryBus.execute(query);

      expect(result.data).toBe(null);
      expect(result.error).toBe(error);
    });
  });

  describe('Commands', () => {
    it('should create command with data and timestamp', () => {
      const command = new CreatePatientCommand({
        name: 'João Silva',
        phone: '11999999999'
      });

      expect(command.data).toEqual({
        name: 'João Silva',
        phone: '11999999999'
      });
      expect(command.timestamp).toBeInstanceOf(Date);
      expect(command.id).toBeDefined();
    });

    it('should have correct constructor names', () => {
      const createCommand = new CreatePatientCommand({});
      const updateCommand = new UpdatePatientCommand({});

      expect(createCommand.constructor.name).toBe('CreatePatientCommand');
      expect(updateCommand.constructor.name).toBe('UpdatePatientCommand');
    });
  });

  describe('Queries', () => {
    it('should create query with params and timestamp', () => {
      const query = new GetPatientsQuery({
        page: 1,
        searchTerm: 'João'
      });

      expect(query.params).toEqual({
        page: 1,
        searchTerm: 'João'
      });
      expect(query.timestamp).toBeInstanceOf(Date);
    });

    it('should have correct constructor names', () => {
      const patientsQuery = new GetPatientsQuery({});
      const patientQuery = new GetPatientByIdQuery({});

      expect(patientsQuery.constructor.name).toBe('GetPatientsQuery');
      expect(patientQuery.constructor.name).toBe('GetPatientByIdQuery');
    });
  });

  describe('Result Objects', () => {
    it('should create command results', () => {
      const successResult = new CommandResult(true, { id: '123' });
      const errorResult = new CommandResult(false, null, new Error('Failed'));

      expect(successResult.success).toBe(true);
      expect(successResult.data).toEqual({ id: '123' });
      expect(successResult.error).toBe(null);
      expect(successResult.timestamp).toBeInstanceOf(Date);

      expect(errorResult.success).toBe(false);
      expect(errorResult.data).toBe(null);
      expect(errorResult.error).toBeInstanceOf(Error);
    });

    it('should create query results', () => {
      const dataResult = new QueryResult([{ id: '1' }], null, { total: 1 });
      const errorResult = new QueryResult(null, new Error('Failed'), {});

      expect(dataResult.data).toEqual([{ id: '1' }]);
      expect(dataResult.error).toBe(null);
      expect(dataResult.metadata).toEqual({ total: 1 });

      expect(errorResult.data).toBe(null);
      expect(errorResult.error).toBeInstanceOf(Error);
      expect(errorResult.metadata).toEqual({});
    });
  });
});
