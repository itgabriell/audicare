import { useState, useEffect, useCallback } from 'react';
import { fetchContactDetails } from '@/lib/messaging';

export const useContactDetails = (contactId) => {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchContactDetails(contactId);
      setContact(data);
    } catch (err) {
      console.error('Error fetching contact details:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { contact, loading, error, refetch: fetchDetails };
};