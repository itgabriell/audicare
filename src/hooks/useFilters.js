import { useState, useEffect, useMemo, useCallback } from 'react';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

/**
 * Custom hook for managing comprehensive filtering logic.
 * Supports conversations and messages filtering with persistence.
 * 
 * @param {Array} data - The dataset to filter.
 * @param {Object} options - Configuration options { storageKey, type: 'conversation'|'message' }.
 */
export const useFilters = (data = [], options = {}) => {
    const { storageKey, type = 'conversation' } = options;
    
    const initialFilters = {
        status: 'all',        // 'all', 'unread', 'archived', 'read', 'sent', 'delivered'
        dateRange: null,      // { from: Date, to: Date }
        messageType: 'all',   // 'all', 'text', 'image', 'audio', 'video', 'document'
        sender: 'all',        // 'all', 'me', 'contact'
        channel: 'all',       // 'all', 'whatsapp', 'instagram', etc.
    };

    const [filters, setFilters] = useState(() => {
        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Rehydrate dates
                    if (parsed.dateRange) {
                        parsed.dateRange.from = parsed.dateRange.from ? new Date(parsed.dateRange.from) : null;
                        parsed.dateRange.to = parsed.dateRange.to ? new Date(parsed.dateRange.to) : null;
                    }
                    return { ...initialFilters, ...parsed };
                }
            } catch (e) {
                console.warn('Failed to load filters', e);
            }
        }
        return initialFilters;
    });

    const [isFiltering, setIsFiltering] = useState(false);

    useEffect(() => {
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(filters));
        }
        
        // Check if any filter is active
        const isActive = 
            filters.status !== 'all' || 
            filters.dateRange !== null || 
            filters.messageType !== 'all' || 
            filters.sender !== 'all' ||
            filters.channel !== 'all';
            
        setIsFiltering(isActive);
    }, [filters, storageKey]);

    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];
        if (!isFiltering) return data;

        return data.filter(item => {
            // 1. Status Filter
            if (filters.status !== 'all') {
                if (type === 'conversation') {
                    if (filters.status === 'unread' && item.unread_count === 0) return false;
                    if (filters.status === 'archived' && item.status !== 'archived') return false;
                    if (filters.status === 'open' && item.status === 'archived') return false; 
                } else if (type === 'message') {
                    // Message status logic
                    if (filters.status === 'read' && item.status !== 'read') return false;
                    if (filters.status === 'delivered' && item.status !== 'delivered') return false;
                }
            }

            // 2. Channel Filter (Conversation only)
            if (type === 'conversation' && filters.channel !== 'all') {
                if (item.channel_type !== filters.channel) return false;
            }

            // 3. Message Type Filter
            if (filters.messageType !== 'all') {
                const itemType = item.message_type || item.type || 'text';
                if (itemType !== filters.messageType) return false;
            }

            // 4. Sender Filter (Message only)
            if (filters.sender !== 'all' && type === 'message') {
                const isMe = item.sender_type === 'user' || item.from === 'me' || item.direction === 'outbound';
                if (filters.sender === 'me' && !isMe) return false;
                if (filters.sender === 'contact' && isMe) return false;
            }

            // 5. Date Range Filter
            if (filters.dateRange && filters.dateRange.from) {
                const dateStr = item.timestamp || item.created_at || item.last_message_at || item.momment;
                if (!dateStr) return false;
                
                const itemDate = new Date(dateStr);
                if (isNaN(itemDate.getTime())) return false;

                const start = startOfDay(filters.dateRange.from);
                const end = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);

                if (!isWithinInterval(itemDate, { start, end })) return false;
            }

            return true;
        });
    }, [data, filters, isFiltering, type]);

    const setFilter = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const clearFilter = useCallback((key) => {
        setFilters(prev => ({ ...prev, [key]: initialFilters[key] }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(initialFilters);
    }, []);

    const activeFilterCount = Object.keys(filters).filter(key => {
        if (key === 'dateRange') return filters[key] !== null;
        return filters[key] !== 'all';
    }).length;

    return {
        filters,
        setFilter,
        clearFilter,
        resetFilters,
        filteredData,
        isFiltering,
        activeFilterCount,
        resultCount: filteredData.length
    };
};