import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPatients, getPatientById, addPatient } from '@/services/patientService';
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

// Mock Supabase is handled in setup.js mostly, but we define specifics here
describe('patientService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(baseService.getClinicId).mockResolvedValue('clinic-123');
        vi.mocked(baseService.getUserId).mockResolvedValue('user-456');
    });

    describe('getPatients', () => {
        it('should return a list of patients for the clinic', async () => {
            const mockData = [{ id: 1, name: 'John Doe' }];
            const mockCount = 1;

            // Chain mocking for Supabase
            const distinctSelectChain = {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: mockCount })
            };

            supabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(distinctSelectChain)
            });

            const result = await getPatients(1, 10);

            expect(baseService.getClinicId).toHaveBeenCalled();
            expect(supabase.from).toHaveBeenCalledWith('patients');
            expect(distinctSelectChain.eq).toHaveBeenCalledWith('clinic_id', 'clinic-123');
            expect(result).toEqual({ data: mockData, count: mockCount });
        });

        it('should handle search terms', async () => {
            const distinctSelectChain = {
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
            };
            supabase.from.mockReturnValue({
                select: vi.fn().mockReturnValue(distinctSelectChain)
            });

            await getPatients(1, 10, 'John');
            expect(distinctSelectChain.or).toHaveBeenCalledWith(expect.stringContaining('John'));
        });
    });

    describe('addPatient', () => {
        it('should successfully add a patient', async () => {
            const newPatient = { name: 'Jane Doe', phone: '123456789' };
            const returnedPatient = { id: 1, ...newPatient };

            const insertChain = {
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: returnedPatient, error: null })
                })
            };

            supabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue(insertChain)
            });

            const result = await addPatient(newPatient);

            expect(baseService.getClinicId).toHaveBeenCalled();
            expect(baseService.getUserId).toHaveBeenCalled();
            expect(supabase.from).toHaveBeenCalledWith('patients');
            expect(result).toEqual(returnedPatient);
        });
    });
});
