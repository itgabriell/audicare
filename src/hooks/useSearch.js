import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Custom hook for handling search operations with debouncing, history, and highlighting.
 * Supports local filtering for immediate feedback.
 * 
 * @param {Array} data - The dataset to search (for client-side filtering).
 * @param {Object} options - Configuration options.
 * @returns {Object} Search state and handlers.
 */
export const useSearch = (data = [], options = {}) => {
    const { 
        searchKeys = ['name', 'phone', 'content', 'text'], 
        debounceMs = 300, 
        initialQuery = '',
        historyKey = 'app_search_history' 
    } = options;

    const [query, setQuery] = useState(initialQuery);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
    const [isSearching, setIsSearching] = useState(false);
    const [history, setHistory] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    // Load history on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(historyKey);
            if (saved) setHistory(JSON.parse(saved));
        } catch (e) {
            console.warn('Failed to load search history', e);
        }
    }, [historyKey]);

    // Debounce Logic
    useEffect(() => {
        if (query !== debouncedQuery) {
            setIsSearching(true);
        }

        const handler = setTimeout(() => {
            setDebouncedQuery(query);
            setIsSearching(false);
        }, debounceMs);

        return () => clearTimeout(handler);
    }, [query, debounceMs, debouncedQuery]);

    // History Management
    const addToHistory = useCallback((term) => {
        if (!term || term.trim().length < 2) return;
        setHistory(prev => {
            const cleanTerm = term.trim();
            // Remove duplicates and keep top 10
            const filtered = prev.filter(h => h.toLowerCase() !== cleanTerm.toLowerCase());
            const newHistory = [cleanTerm, ...filtered].slice(0, 10);
            localStorage.setItem(historyKey, JSON.stringify(newHistory));
            return newHistory;
        });
    }, [historyKey]);

    const removeFromHistory = useCallback((term) => {
        setHistory(prev => {
            const newHistory = prev.filter(h => h !== term);
            localStorage.setItem(historyKey, JSON.stringify(newHistory));
            return newHistory;
        });
    }, [historyKey]);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem(historyKey);
    }, [historyKey]);

    // Filtering Logic (Client-Side)
    const results = useMemo(() => {
        if (!debouncedQuery) return data;
        
        const lowerQuery = debouncedQuery.toLowerCase();
        
        return data.filter(item => {
            return searchKeys.some(key => {
                const value = item[key];
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(lowerQuery);
                }
                if (typeof value === 'number') {
                    return value.toString().includes(lowerQuery);
                }
                return false;
            });
        });
    }, [data, debouncedQuery, searchKeys]);

    // Highlighting Utility
    const getHighlightedText = useCallback((text, highlight) => {
        if (!highlight || !text) return [{ text: text || '', isMatch: false }];
        
        // Escape special regex characters
        const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.toString().split(new RegExp(`(${escapedHighlight})`, 'gi'));
        
        return parts.map((part, i) => ({
            text: part,
            isMatch: part.toLowerCase() === highlight.toLowerCase(),
            key: i
        }));
    }, []);

    return {
        query,
        setQuery,
        debouncedQuery,
        results,
        isSearching,
        history,
        isOpen,
        setIsOpen,
        addToHistory,
        removeFromHistory,
        clearHistory,
        getHighlightedText,
        count: results.length
    };
};