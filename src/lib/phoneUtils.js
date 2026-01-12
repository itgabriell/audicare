export const formatPhoneE164 = (phone) => {
  if (!phone) return '';
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If empty, return empty
  if (!cleaned) return '';

  // If it already starts with 55 (Brazil DDI), just add +
  if (cleaned.startsWith('55') && cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  // Otherwise assume it's a local number and add +55
  return `+55${cleaned}`;
};

export const validatePhoneE164 = (phone) => {
  if (!phone) return false;
  // Basic E.164 regex for Brazil: +55 followed by 2 digit DDD and 8 or 9 digit number
  return /^\+55\d{10,11}$/.test(phone);
};

export const formatPhoneDisplay = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  // Simple formatting logic
  if (cleaned.length === 11) { // Mobile with DDD
      return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 13 && cleaned.startsWith('55')) { // Full E164
      return `(${cleaned.slice(2,4)}) ${cleaned.slice(4,9)}-${cleaned.slice(9)}`;
  }
  return phone;
};