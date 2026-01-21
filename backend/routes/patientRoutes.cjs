const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (igual ao index.js)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [PatientRoutes] SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/patients/search-by-phone
 * Busca paciente por número de telefone (para integração Chatwoot)
 */
router.get('/search-by-phone', async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        message: 'Parâmetro phone é obrigatório'
      });
    }

    // Limpar o número do telefone (remover não-dígitos)
    const cleanPhone = phone.replace(/\D/g, '');

    console.log(`🔍 [API] Buscando paciente por telefone: ${cleanPhone}`);

    // Buscar paciente por telefone primário
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        id,
        name,
        phone,
        email,
        birthdate,
        created_at,
        updated_at,
        patient_phones (
          phone,
          is_primary,
          is_whatsapp
        ),
        street,
        number,
        neighborhood,
        city,
        state,
        zip_code,
        complement,
        patient_tags (
          tags (
            name,
            color
          )
        )
      `)
      .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone}%`)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ [API] Erro na consulta:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }

    // Se não encontrou pelo telefone primário, buscar nos telefones secundários
    if (!patient) {
      const { data: patientBySecondary, error: secondaryError } = await supabase
        .from('patient_phones')
        .select(`
          phone,
          is_primary,
          is_whatsapp,
          patients (
            id,
            name,
            phone,
            email,
            birthdate,
            created_at,
            updated_at,
            street,
            number,
            neighborhood,
            city,
            state,
            zip_code,
            complement,
            patient_tags (
              tags (
                name,
                color
              )
            )
          )
        `)
        .eq('phone', cleanPhone)
        .limit(1)
        .single();

      if (secondaryError && secondaryError.code !== 'PGRST116') {
        console.error('❌ [API] Erro na consulta secundária:', secondaryError);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: secondaryError.message
        });
      }

      if (patientBySecondary) {
        console.log(`✅ [API] Paciente encontrado por telefone secundário: ${patientBySecondary.patients.name}`);
        return res.json({
          success: true,
          patient: formatPatientData(patientBySecondary.patients, patientBySecondary)
        });
      }
    }

    if (patient) {
      console.log(`✅ [API] Paciente encontrado: ${patient.name}`);
      return res.json({
        success: true,
        patient: formatPatientData(patient)
      });
    }

    console.log(`❌ [API] Paciente não encontrado para telefone: ${cleanPhone}`);
    return res.json({
      success: false,
      message: 'Patient not found',
      patient: null
    });

  } catch (error) {
    console.error('❌ [API] Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/patients/:id/contacts
 * Busca dados de contato do paciente para sincronização
 */
router.get('/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 [API] Buscando dados de contato para paciente ID: ${id}`);

    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        id,
        name,
        phone,
        email,
        birthdate,
        created_at,
        updated_at,
        patient_phones (
          phone,
          is_primary,
          is_whatsapp
        ),
        street,
        number,
        neighborhood,
        city,
        state,
        zip_code,
        complement
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [API] Erro ao buscar paciente:', error);
      return res.status(404).json({
        success: false,
        error: 'Patient not found',
        message: 'Paciente não encontrado'
      });
    }

    const contactData = {
      id: patient.id,
      name: patient.name,
      primary_phone: patient.phone,
      email: patient.email,
      birth_date: patient.birthdate,
      phones: patient.patient_phones || [],
    addresses: [{
      street: patient.street,
      number: patient.number,
      neighborhood: patient.neighborhood,
      city: patient.city,
      state: patient.state,
      zip_code: patient.zip_code,
      complement: patient.complement
    }].filter(addr => addr.street || addr.city), // Filtrar endereços vazios
      whatsapp_phone: getWhatsAppPhone(patient.patient_phones)
    };

    console.log(`✅ [API] Dados de contato retornados para: ${patient.name}`);
    return res.json({
      success: true,
      contact: contactData
    });

  } catch (error) {
    console.error('❌ [API] Erro interno:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Função auxiliar para formatar dados do paciente
 */
function formatPatientData(patient, secondaryPhone = null) {
  const phones = patient.patient_phones || [];
  if (secondaryPhone) {
    phones.push(secondaryPhone);
  }

  return {
    id: patient.id,
    name: patient.name,
    primary_phone: patient.phone,
    email: patient.email,
    birth_date: patient.birthdate,
    created_at: patient.created_at,
    updated_at: patient.updated_at,
    phones: phones,
    addresses: [{
      street: patient.street,
      number: patient.number,
      neighborhood: patient.neighborhood,
      city: patient.city,
      state: patient.state,
      zip_code: patient.zip_code,
      complement: patient.complement
    }].filter(addr => addr.street || addr.city), // Filtrar endereços vazios
    tags: patient.patient_tags?.map(pt => pt.tags) || [],
    whatsapp_phone: getWhatsAppPhone(phones)
  };
}

/**
 * Função auxiliar para encontrar telefone WhatsApp
 */
function getWhatsAppPhone(phones) {
  if (!phones || phones.length === 0) return null;

  // Primeiro, buscar telefone marcado como WhatsApp
  const whatsappPhone = phones.find(p => p.is_whatsapp);
  if (whatsappPhone) return whatsappPhone.phone;

  // Se não encontrou, usar telefone primário
  const primaryPhone = phones.find(p => p.is_primary);
  if (primaryPhone) return primaryPhone.phone;

  // Por último, o primeiro telefone da lista
  return phones[0].phone;
}

module.exports = router;
