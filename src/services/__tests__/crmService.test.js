import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasks, addTask, getConversations } from '@/services/crmService';
import { supabase } from '@/lib/customSupabaseClient';
import * as baseService from '@/services/baseService';

// Mock baseService dependencies
vi.mock('@/services/baseService', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getClinicId: vi.fn(),
        getUserId: vi.fn(),
    };
});

describe('crmService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(baseService.getClinicId).mockResolvedValue('clinic-123');
        vi.mocked(baseService.getUserId).mockResolvedValue('user-456');
    });

    describe('getTasks', () => {
        it('should fetch tasks for the clinic', async () => {
            const mockTasks = [{ id: 1, title: 'Task 1' }];

            const selectChain = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockTasks, error: null })
            };

            supabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(selectChain)
            });

            const result = await getTasks();

            expect(supabase.from).toHaveBeenCalledWith('tasks');
            expect(selectChain.eq).toHaveBeenCalledWith('clinic_id', 'clinic-123');
            expect(result).toEqual(mockTasks);
        });
    });

    describe('addTask', () => {
        it('should add a task with created_by user id', async () => {
            const newTask = { title: 'New Task' };
            const returnedTask = { id: 1, ...newTask };

            const insertChain = {
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: returnedTask, error: null })
                })
            };

            supabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue(insertChain)
            });

            const result = await addTask(newTask);

            expect(baseService.getUserId).toHaveBeenCalled();
            const insertCall = supabase.from().insert.mock.calls[0][0][0];
            expect(insertCall).toEqual(expect.objectContaining({
                clinic_id: 'clinic-123',
                created_by: 'user-456',
                title: 'New Task'
            }));
            expect(result).toEqual(returnedTask);
        });
    });

    describe('getConversations', () => {
        it('should fetch all conversations if no channel filter provided', async () => {
            const mockConvos = [{ id: 1, channel_type: 'whatsapp' }];

            const selectChain = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockConvos, error: null })
            };

            supabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(selectChain)
            });

            await getConversations();

            // Should filter by clinic_id
            expect(selectChain.eq).toHaveBeenCalledWith('clinic_id', 'clinic-123');
            // Should NOT filter by channel_type
            expect(selectChain.eq).not.toHaveBeenCalledWith('channel_type', expect.any(String));
        });

        it('should filter by channel if provided', async () => {
            const selectChain = {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: [], error: null })
            };

            supabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(selectChain)
            });

            await getConversations({ channel: 'instagram' });

            expect(selectChain.eq).toHaveBeenCalledWith('channel_type', 'instagram');
        });
    });
});
