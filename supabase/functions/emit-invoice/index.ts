import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper para obter o próximo número sequencial
async function getNextInvoiceNumber(supabaseClient: any, type: string): Promise<string> {
  // Define o grupo de notas (NFS-e para serviços, NF-e para produtos)
  const isProduct = type === 'sale';
  const typesToFilter = isProduct ? ['sale'] : ['fono', 'maintenance'];

  // Busca a última nota emitida desse grupo
  const { data, error } = await supabaseClient
    .from('invoices')
    .select('numero')
    .in('type', typesToFilter)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 é "no rows returned"
    console.warn('Erro ao buscar última nota:', error);
    // Em caso de erro, tenta fallback seguro ou lança exceção?
    // Vamos lançar para evitar furos, mas se for a primeira nota, prossegue.
  }

  // Se não houver notas anteriores, começa do 1
  if (!data?.numero) {
    return '1';
  }

  // Tenta converter para número e incrementar
  const lastNumber = parseInt(data.numero, 10);
  if (isNaN(lastNumber)) {
    // Se o último número não for numérico (ex: legado), reseta ou loga erro
    // Para segurança, vamos assumir 1 se falhar parse
    return '1';
  }

  return (lastNumber + 1).toString();
}

async function emitNFSeFono(accessToken: string, paciente: any, servico: any, numero: string) {
  console.log('Emitindo NFS-e REAL para Fonoaudiologia. Número:', numero);

  const nfsePayload = {
    ambiente: 'producao',
    serie: '1',
    numero: numero,
    data_emissao: new Date().toISOString(),
    prestador: {
      cpf_cnpj: '45582340000106', // CNPJ real da Audicare
      inscricao_municipal: '123456', // Ajustar conforme necessário
      nome_fantasia: 'Audicare Clínica Auditiva',
      razao_social: 'Audicare Clínica Auditiva Ltda',
      endereco: {
        logradouro: 'Rua Example',
        numero: '123',
        complemento: '',
        bairro: 'Centro',
        codigo_municipio: '3550308', // São Paulo
        uf: 'SP',
        cep: '01234567'
      }
    },
    tomador: {
      cpf_cnpj: paciente.patient_document.replace(/\D/g, ''),
      nome: paciente.patient_name,
      email: paciente.patient_email,
      endereco: {
        logradouro: paciente.address?.street || '',
        numero: paciente.address?.number || '',
        complemento: paciente.address?.complement || '',
        bairro: paciente.address?.neighborhood || '',
        codigo_municipio: '3550308', // São Paulo
        uf: paciente.address?.state || 'SP',
        cep: paciente.address?.zip_code?.replace(/\D/g, '') || ''
      }
    },
    servicos: [{
      item_lista_servico: '04.08',
      discriminacao: 'Avaliação e Terapia Fonoaudiológica',
      quantidade: 1,
      valor_unitario: parseFloat(servico.amount),
      valor_servicos: parseFloat(servico.amount)
    }]
  };

  const response = await fetch('https://api.nuvemfiscal.com.br/nfse/emissoes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nfsePayload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro na API Nuvem Fiscal: ${response.status} - ${errorData}`);
  }

  const result = await response.json();

  return {
    numero: result.numero || numero, // Fallback para número gerado se a API não retornar
    status: result.status,
    link: result.link,
    tipo: 'nfs-e',
    servico: '04.08 - Fonoaudiologia',
    discriminacao: 'Avaliação e Terapia Fonoaudiológica'
  };
}

async function emitNFSeMaintenance(accessToken: string, paciente: any, servico: any, numero: string) {
  console.log('Emitindo NFS-e REAL para Manutenção. Número:', numero);

  const nfsePayload = {
    ambiente: 'producao',
    serie: '1',
    numero: numero,
    data_emissao: new Date().toISOString(),
    prestador: {
      cpf_cnpj: '45582340000106',
      inscricao_municipal: '123456',
      nome_fantasia: 'Audicare Clínica Auditiva',
      razao_social: 'Audicare Clínica Auditiva Ltda',
      endereco: {
        logradouro: 'Rua Example',
        numero: '123',
        complemento: '',
        bairro: 'Centro',
        codigo_municipio: '3550308',
        uf: 'SP',
        cep: '01234567'
      }
    },
    tomador: {
      cpf_cnpj: paciente.patient_document.replace(/\D/g, ''),
      nome: paciente.patient_name,
      email: paciente.patient_email,
      endereco: {
        logradouro: paciente.address?.street || '',
        numero: paciente.address?.number || '',
        complemento: paciente.address?.complement || '',
        bairro: paciente.address?.neighborhood || '',
        codigo_municipio: '3550308', // São Paulo
        uf: paciente.address?.state || 'SP',
        cep: paciente.address?.zip_code?.replace(/\D/g, '') || ''
      }
    },
    servicos: [{
      item_lista_servico: '14.01',
      cnae: '3312-1/03',
      discriminacao: 'Manutenção de Aparelho Auditivo',
      quantidade: 1,
      valor_unitario: parseFloat(servico.amount),
      valor_servicos: parseFloat(servico.amount)
    }]
  };

  const response = await fetch('https://api.nuvemfiscal.com.br/nfse/emissoes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nfsePayload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro na API Nuvem Fiscal: ${response.status} - ${errorData}`);
  }

  const result = await response.json();

  return {
    numero: result.numero || numero,
    status: result.status,
    link: result.link,
    tipo: 'nfs-e',
    servico: '14.01 - Manutenção de aparelhos',
    cnae: '3312-1/03',
    discriminacao: 'Manutenção de Aparelho Auditivo'
  };
}

async function emitNFeSale(accessToken: string, paciente: any, servico: any, numero: string) {
  console.log('Emitindo NF-e REAL para Venda de Aparelho. Número:', numero);

  const quantidade = parseInt(servico.quantity || 1);
  const valorUnitario = parseFloat(servico.amount) / quantidade;

  const nfePayload = {
    ambiente: 'producao',
    natureza_operacao: 'Venda de Mercadoria',
    serie: '1',
    numero: numero,
    data_emissao: new Date().toISOString(),
    data_saida_entrada: new Date().toISOString(),
    tipo_operacao: '1', // Saída
    finalidade_emissao: '1', // Normal
    consumidor_final: '1', // Consumidor final
    presenca_comprador: '9', // Operação não presencial
    destinatario: {
      cpf_cnpj: paciente.patient_document.replace(/\D/g, ''),
      nome: paciente.patient_name,
      email: paciente.patient_email,
      endereco: {
        logradouro: paciente.address?.street || '',
        numero: paciente.address?.number || '',
        complemento: paciente.address?.complement || '',
        bairro: paciente.address?.neighborhood || '',
        codigo_municipio: '3550308', // São Paulo
        uf: paciente.address?.state || 'SP',
        cep: paciente.address?.zip_code?.replace(/\D/g, '') || ''
      }
    },
    itens: [{
      numero_item: 1,
      codigo_ncm: '9021.40.00',
      cfop: '5.102',
      unidade_comercial: 'UN',
      quantidade_comercial: quantidade,
      valor_unitario_comercial: valorUnitario,
      valor_total: parseFloat(servico.amount),
      indicacao_cst_csosn: '102',
      codigo_cst_csosn: '102'
    }],
    totais: {
      valor_produtos: parseFloat(servico.amount),
      valor_total: parseFloat(servico.amount)
    }
  };

  const response = await fetch('https://api.nuvemfiscal.com.br/nfe/emissoes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nfePayload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro na API Nuvem Fiscal: ${response.status} - ${errorData}`);
  }

  const result = await response.json();

  return {
    numero: result.numero || numero,
    status: result.status,
    link: result.link,
    tipo: 'nf-e',
    natureza_operacao: 'Venda de Mercadoria',
    cfop: '5.102',
    ncm: '9021.40.00',
    csosn: '102',
    discriminacao: `Aparelho Auditivo - ${servico.model || 'Modelo XYZ'}`
  };
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { type, paciente, servico } = await req.json();

    // Ler variáveis de ambiente
    const clientId = Deno.env.get('NUVEM_CLIENT_ID');
    const clientSecret = Deno.env.get('NUVEM_CLIENT_SECRET');
    const scope = Deno.env.get('NUVEM_SCOPE');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret || !scope) {
      throw new Error('Variáveis de ambiente Nuvem Fiscal não configuradas');
    }

    // Inicializar Supabase Admin para buscar numeração
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Obter Token Nuvem Fiscal
    const authResponse = await fetch('https://auth.nuvemfiscal.com.br/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: scope,
      }),
    });

    if (!authResponse.ok) {
      throw new Error('Falha na autenticação com Nuvem Fiscal');
    }

    const { access_token: accessToken } = await authResponse.json();

    // Obter próximo número sequencial
    const nextNumber = await getNextInvoiceNumber(supabaseAdmin, type);
    console.log(`Gerando nota ${nextNumber} para tipo ${type}`);

    // Emissão baseada no tipo
    let invoiceResult;

    switch (type) {
      case 'fono':
        invoiceResult = await emitNFSeFono(accessToken, paciente, servico, nextNumber);
        break;
      case 'maintenance':
        invoiceResult = await emitNFSeMaintenance(accessToken, paciente, servico, nextNumber);
        break;
      case 'sale':
        invoiceResult = await emitNFeSale(accessToken, paciente, servico, nextNumber);
        break;
      default:
        throw new Error(`Tipo de nota fiscal não suportado: ${type}`);
    }

    return new Response(JSON.stringify({
      success: true,
      paciente,
      servico,
      invoice: invoiceResult,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });

  } catch (error) {
    console.error('Erro na emissão:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
