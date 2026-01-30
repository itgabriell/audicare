import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotification, notificationService } from '@/services/notificationService';
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

describe('notificationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(baseService.getClinicId).mockResolvedValue('clinic-123');
        vi.mocked(baseService.getUserId).mockResolvedValue('user-456');
    });

    describe('createNotification', () => {
        it('should create a notification with auto-filled IDs', async () => {
            const notificationData = {
                title: 'Test Notification',
                message: 'This is a test',
                type: 'info'
            };

            const insertChain = {
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 1, ...notificationData }, error: null })
                })
            };

            supabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue(insertChain)
            });

            await createNotification(notificationData);

            expect(baseService.getClinicId).toHaveBeenCalled();
            expect(baseService.getUserId).toHaveBeenCalled();
            expect(supabase.from).toHaveBeenCalledWith('notifications');

            const insertCall = supabase.from().insert.mock.calls[0][0][0];
            expect(insertCall).toEqual(expect.objectContaining({
                clinic_id: 'clinic-123',
                user_id: 'user-456',
                title: 'Test Notification',
                type: 'info'
            }));
        });
    });

    describe('compatibility wrapper (notify)', () => {
        it('should map notify call to createNotification structure', async () => {
            // We mock the internal createNotification if possible, but since it's in the same file
            // we can spy on the supabase insert which is the ultimate effect.

            const insertChain = {
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { id: 2 }, error: null })
                })
            };

            supabase.from.mockReturnValue({
                insert: vi.fn().mockReturnValue(insertChain)
            });

            await notificationService.notify('Legacy Title', 'Legacy Message', { key: 'value' });

            const insertCall = supabase.from().insert.mock.calls[0][0][0];
            expect(insertCall).toEqual(expect.objectContaining({
                title: 'Legacy Title',
                message: 'Legacy Message',
                metadata: { key: 'value' },
                type: 'system' // Default type defined in wrapper
            }));
        });
    });
});
