import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAppointments, updateAppointment } from '@/services/appointmentService';
import { supabase } from '@/lib/customSupabaseClient';
import * as baseService from '@/services/baseService';

// Mock baseService dependencies
vi.mock('@/services/baseService', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getClinicId: vi.fn(),
    };
});

describe('appointmentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(baseService.getClinicId).mockResolvedValue('clinic-123');
    });

    describe('getAppointments', () => {
        it('should return transformed appointments with contact info', async () => {
            const mockRawData = [
                {
                    id: 1,
                    appointment_date: '2023-01-01',
                    patient: { id: 10, name: 'Alice' }
                },
                {
                    id: 2,
                    appointment_date: '2023-01-02',
                    patient: null
                }
            ];

            const selectChain = {
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockRawData, error: null })
            };

            supabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(selectChain)
            });

            const result = await getAppointments();

            expect(result).toHaveLength(2);
            expect(result[0].contact).toEqual({ id: 10, name: 'Alice' });
            expect(result[1].contact).toEqual({ name: 'Paciente' });
        });
    });

    describe('updateAppointment', () => {
        it('should handle object argument signature and filter fields', async () => {
            const updateData = {
                id: 1,
                status: 'confirmed',
                invalid_field: 'should be ignored',
                notes: 'Updated'
            };

            const updateChain = {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 1, status: 'confirmed' }, error: null })
                })
            };

            supabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue(updateChain)
            });

            await updateAppointment(updateData);

            expect(supabase.from).toHaveBeenCalledWith('appointments');

            // Verify that only allowed fields were passed to update
            const expectedUpdatePayload = { status: 'confirmed', notes: 'Updated' };
            expect(updateChain.eq).toHaveBeenCalledWith('id', 1);

            // Access the first argument of the update call
            const actualUpdatePayload = supabase.from().update.mock.calls[0][0];
            expect(actualUpdatePayload).toEqual(expect.objectContaining(expectedUpdatePayload));
            expect(actualUpdatePayload).not.toHaveProperty('invalid_field');
        });

        it('should handle id + updates argument signature', async () => {
            const updateChain = {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 2 }, error: null })
                })
            };

            supabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue(updateChain)
            });

            await updateAppointment(2, { status: 'cancelled' });

            expect(supabase.from).toHaveBeenCalledWith('appointments');
            const actualUpdatePayload = supabase.from().update.mock.calls[0][0];
            expect(actualUpdatePayload).toEqual({ status: 'cancelled' });
        });
    });
});
