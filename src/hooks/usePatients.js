import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPatients as getPatientsAPI,
  getPatientById as getPatientByIdAPI,
  addPatient as addPatientAPI,
  updatePatient as updatePatientAPI,
  deletePatient as deletePatientAPI,
  checkDuplicatePatient as checkDuplicatePatientAPI
} from '@/database';
import { queryKeys } from '@/lib/queryClient';

// Hook para buscar pacientes com paginação
export const usePatients = (page = 1, pageSize = 10, searchTerm = '', sortBy = 'created_at', sortOrder = 'desc') => {
  return useQuery({
    queryKey: [...queryKeys.patients, page, pageSize, searchTerm, sortBy, sortOrder],
    queryFn: () => getPatientsAPI(page, pageSize, searchTerm, sortBy, sortOrder),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para buscar paciente por ID
export const usePatient = (id) => {
  return useQuery({
    queryKey: queryKeys.patient(id),
    queryFn: () => getPatientByIdAPI(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para adicionar paciente
export const useAddPatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addPatientAPI,
    onSuccess: () => {
      // Invalidate todas as queries de pacientes
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
  });
};

// Hook para atualizar paciente
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => updatePatientAPI(id, updates),
    onSuccess: (data, { id }) => {
      // Update cache do paciente específico
      queryClient.setQueryData(queryKeys.patient(id), data);
      // Invalidate lista de pacientes
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
  });
};

// Hook para deletar paciente
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePatientAPI,
    onSuccess: () => {
      // Invalidate todas as queries de pacientes
      queryClient.invalidateQueries({ queryKey: queryKeys.patients });
    },
  });
};

// Hook para verificar duplicatas
export const useCheckDuplicatePatient = () => {
  return useMutation({
    mutationFn: ({ name, cpf }) => checkDuplicatePatientAPI(name, cpf),
  });
};
