/**
 * Utilitários para importação de dados
 * Inclui validação, normalização e detecção de duplicatas
 */

import { formatPhoneE164, validatePhoneE164 } from './phoneUtils';

/**
 * Valida e normaliza CPF
 */
export const validateCPF = (cpf) => {
  if (!cpf) return { valid: false, normalized: null, error: 'CPF é obrigatório' };
  
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) {
    return { valid: false, normalized: cleaned, error: 'CPF deve ter 11 dígitos' };
  }
  
  // Verifica se não é uma sequência de números repetidos
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: 'CPF inválido (números repetidos)' };
  }
  
  // Validação básica de dígito verificador
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) {
    return { valid: false, normalized: cleaned, error: 'CPF inválido (dígito verificador)' };
  }
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) {
    return { valid: false, normalized: cleaned, error: 'CPF inválido (dígito verificador)' };
  }
  
  // Formata: 000.000.000-00
  const formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  return { valid: true, normalized: formatted, error: null };
};

/**
 * Valida e normaliza email
 */
export const validateEmail = (email) => {
  if (!email) return { valid: true, normalized: null, error: null }; // Email é opcional
  
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, normalized: trimmed, error: 'Email inválido' };
  }
  
  return { valid: true, normalized: trimmed, error: null };
};

/**
 * Valida e normaliza data de nascimento
 */
export const validateBirthdate = (date) => {
  if (!date) return { valid: true, normalized: null, error: null }; // Data é opcional
  
  // Tenta diferentes formatos de data
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ];
  
  let year, month, day;
  let matched = false;
  
  for (const format of formats) {
    const match = date.trim().match(format);
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        // DD/MM/YYYY ou DD-MM-YYYY
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      matched = true;
      break;
    }
  }
  
  if (!matched) {
    return { valid: false, normalized: date, error: 'Formato de data inválido' };
  }
  
  // Valida valores
  if (year < 1900 || year > new Date().getFullYear()) {
    return { valid: false, normalized: date, error: 'Ano inválido' };
  }
  if (month < 1 || month > 12) {
    return { valid: false, normalized: date, error: 'Mês inválido' };
  }
  if (day < 1 || day > 31) {
    return { valid: false, normalized: date, error: 'Dia inválido' };
  }
  
  // Formata como YYYY-MM-DD
  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dateObj = new Date(formatted);
  
  // Verifica se a data é válida
  if (dateObj.getFullYear() !== year || dateObj.getMonth() + 1 !== month || dateObj.getDate() !== day) {
    return { valid: false, normalized: date, error: 'Data inválida' };
  }
  
  return { valid: true, normalized: formatted, error: null };
};

/**
 * Normaliza nome (remove espaços extras, capitaliza)
 */
export const normalizeName = (name) => {
  if (!name) return null;
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Valida e normaliza dados de um paciente
 */
export const validateAndNormalizePatient = (rawData) => {
  const errors = [];
  const warnings = [];
  const normalized = {};
  
  // Nome (obrigatório)
  const name = normalizeName(rawData.name);
  if (!name || name.trim().length < 3) {
    errors.push('Nome é obrigatório e deve ter pelo menos 3 caracteres');
  } else {
    normalized.name = name;
  }
  
  // CPF (obrigatório)
  if (rawData.cpf) {
    const cpfValidation = validateCPF(rawData.cpf);
    if (!cpfValidation.valid) {
      errors.push(`CPF: ${cpfValidation.error}`);
    } else {
      normalized.cpf = cpfValidation.normalized;
    }
  } else {
    errors.push('CPF é obrigatório');
  }
  
  // Telefones (opcional, mas se presente deve ser válido)
  // Suporta múltiplos telefones separados por vírgula, ponto e vírgula, ou pipe
  if (rawData.phone) {
    const phoneString = String(rawData.phone).trim();
    const phoneSeparators = /[,;|]/;
    const phoneList = phoneSeparators.test(phoneString) 
      ? phoneString.split(phoneSeparators).map(p => p.trim()).filter(p => p)
      : [phoneString];

    const validPhones = [];
    phoneList.forEach((phone, index) => {
      const formattedPhone = formatPhoneE164(phone);
      if (validatePhoneE164(formattedPhone)) {
        validPhones.push({
          phone: formattedPhone,
          phone_type: 'mobile',
          is_primary: index === 0, // Primeiro telefone é principal
          is_whatsapp: true,
          contact_name: null,
          notes: null,
        });
      } else {
        warnings.push(`Telefone ${index + 1} inválido: ${phone}, será ignorado`);
      }
    });

    if (validPhones.length > 0) {
      normalized.phones = validPhones;
      // Manter compatibilidade: telefone principal no campo phone
      normalized.phone = validPhones[0].phone;
    }
  }

  // Suportar também colunas phone2, phone3, etc.
  let phoneIndex = 2;
  while (rawData[`phone${phoneIndex}`]) {
    const phone = String(rawData[`phone${phoneIndex}`]).trim();
    if (phone) {
      const formattedPhone = formatPhoneE164(phone);
      if (validatePhoneE164(formattedPhone)) {
        if (!normalized.phones) {
          normalized.phones = [];
        }
        normalized.phones.push({
          phone: formattedPhone,
          phone_type: 'mobile',
          is_primary: false,
          is_whatsapp: true,
          contact_name: null,
          notes: null,
        });
      } else {
        warnings.push(`Telefone ${phoneIndex} inválido: ${phone}, será ignorado`);
      }
    }
    phoneIndex++;
  }
  
  // Email (opcional)
  if (rawData.email) {
    const emailValidation = validateEmail(rawData.email);
    if (!emailValidation.valid) {
      warnings.push(`Email: ${emailValidation.error}, será ignorado`);
    } else {
      normalized.email = emailValidation.normalized;
    }
  }
  
  // Data de nascimento (opcional)
  if (rawData.birthdate) {
    const dateValidation = validateBirthdate(rawData.birthdate);
    if (!dateValidation.valid) {
      warnings.push(`Data de nascimento: ${dateValidation.error}, será ignorada`);
    } else {
      normalized.birthdate = dateValidation.normalized;
    }
  }
  
  // Campos opcionais (apenas copia se existir)
  if (rawData.address) normalized.address = rawData.address.trim();
  if (rawData.medical_history) normalized.medical_history = rawData.medical_history.trim();
  if (rawData.notes) normalized.notes = rawData.notes.trim();
  if (rawData.allergies) normalized.allergies = rawData.allergies.trim();
  if (rawData.medications) normalized.medications = rawData.medications.trim();
  if (rawData.gender) normalized.gender = rawData.gender.trim();
  
  return {
    valid: errors.length === 0,
    normalized,
    errors,
    warnings,
  };
};

/**
 * Processa CSV e retorna linhas parseadas
 */
export const parseCSV = (text, delimiter = ',') => {
  const lines = [];
  const rows = text.split('\n').filter(line => line.trim());
  
  if (rows.length === 0) return { headers: [], rows: [] };
  
  // Detecta delimitador automaticamente
  const firstLine = rows[0];
  let detectedDelimiter = delimiter;
  if (!delimiter) {
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
    };
    detectedDelimiter = Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
  }
  
  // Parse CSV com suporte a aspas
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === detectedDelimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseLine(rows[0]).map(h => h.replace(/^"|"$/g, '').trim());
  
  for (let i = 1; i < rows.length; i++) {
    const values = parseLine(rows[i]).map(v => v.replace(/^"|"$/g, '').trim());
    if (values.some(v => v)) { // Ignora linhas completamente vazias
      lines.push(values);
    }
  }
  
  return { headers, rows: lines };
};

