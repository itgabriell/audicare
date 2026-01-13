import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Command,
  Search,
  Users,
  Calendar,
  Briefcase,
  FileText,
  Settings,
  X,
  ArrowRight,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/SupabaseAuthContext'
import { supabase } from '@/lib/customSupabaseClient'

const CommandPalette = ({ open, onOpenChange }) => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Categorias de busca
  const categories = useMemo(() => [
    {
      id: 'patients',
      label: 'Pacientes',
      icon: Users,
      search: async (q) => {
        if (!profile?.clinic_id || q.length < 2) return []

        const { data } = await supabase
          .from('patients')
          .select('id, name, phone, cpf')
          .eq('clinic_id', profile.clinic_id)
          .or(`name.ilike.%${q}%,cpf.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(5)

        return data?.map(patient => ({
          id: patient.id,
          type: 'patient',
          title: patient.name,
          subtitle: patient.phone ? formatPhone(patient.phone) : patient.cpf || 'Sem contato',
          url: `/patients/${patient.id}`,
          category: 'Pacientes'
        })) || []
      }
    },
    {
      id: 'appointments',
      label: 'Agendamentos',
      icon: Calendar,
      search: async (q) => {
        if (!profile?.clinic_id || q.length < 2) return []

        const { data } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_type,
            patients (name),
            status
          `)
          .eq('clinic_id', profile.clinic_id)
          .or(`appointment_type.ilike.%${q}%,patients.name.ilike.%${q}%`)
          .order('appointment_date', { ascending: false })
          .limit(5)

        return data?.map(apt => ({
          id: apt.id,
          type: 'appointment',
          title: `${apt.patients?.name || 'Paciente'} - ${apt.appointment_type || 'Consulta'}`,
          subtitle: formatDateTime(apt.appointment_date),
          url: '/appointments',
          category: 'Agendamentos',
          status: apt.status
        })) || []
      }
    },
    {
      id: 'tasks',
      label: 'Tarefas',
      icon: Briefcase,
      search: async (q) => {
        if (!profile?.clinic_id || q.length < 2) return []

        const { data } = await supabase
          .from('tasks')
          .select('id, title, status')
          .eq('clinic_id', profile.clinic_id)
          .ilike('title', `%${q}%`)
          .limit(5)

        return data?.map(task => ({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: `Status: ${task.status}`,
          url: '/tasks',
          category: 'Tarefas'
        })) || []
      }
    }
  ], [profile?.clinic_id])

  // Ações rápidas (sempre disponíveis)
  const quickActions = useMemo(() => [
    {
      id: 'new-patient',
      type: 'action',
      title: 'Novo Paciente',
      subtitle: 'Cadastrar novo paciente',
      url: '/patients',
      category: 'Ações',
      action: () => {
        // Implementar abertura do modal de novo paciente
        navigate('/patients')
      }
    },
    {
      id: 'new-appointment',
      type: 'action',
      title: 'Novo Agendamento',
      subtitle: 'Agendar consulta',
      url: '/appointments',
      category: 'Ações',
      action: () => navigate('/appointments')
    },
    {
      id: 'dashboard',
      type: 'navigation',
      title: 'Dashboard',
      subtitle: 'Visão geral da clínica',
      url: '/dashboard',
      category: 'Navegação'
    },
    {
      id: 'inbox',
      type: 'navigation',
      title: 'Inbox',
      subtitle: 'Mensagens e conversas',
      url: '/inbox',
      category: 'Navegação'
    }
  ], [navigate])

  // Busca global
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults(quickActions)
      return
    }

    setLoading(true)
    try {
      const searchPromises = categories.map(category => category.search(searchQuery))
      const searchResults = await Promise.all(searchPromises)
      const allResults = searchResults.flat()

      // Limitar resultados e adicionar ações rápidas no topo se relevante
      const finalResults = allResults.length > 0 ? allResults : quickActions
      setResults(finalResults.slice(0, 8))
    } catch (error) {
      console.error('Search error:', error)
      setResults(quickActions)
    } finally {
      setLoading(false)
    }
  }, [categories, quickActions])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 150)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return

      switch (e.key) {
        case 'Escape':
          onOpenChange(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, results, selectedIndex, onOpenChange])

  const handleSelect = (item) => {
    if (item.action) {
      item.action()
    } else {
      navigate(item.url)
    }
    onOpenChange(false)
    setQuery('')
    setSelectedIndex(0)
  }

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setResults(quickActions)
    }
  }, [open, quickActions])

  const getIcon = (item) => {
    if (item.type === 'patient') return Users
    if (item.type === 'appointment') return Calendar
    if (item.type === 'task') return Briefcase
    if (item.type === 'action') return FileText
    return Hash
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'cancelled': return 'text-red-600'
      case 'no_show': return 'text-orange-600'
      case 'confirmed': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        style={{ zIndex: 9999 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-2xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-card border rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar pacientes, agendamentos, tarefas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum resultado encontrado</p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((item, index) => {
                    const Icon = getIcon(item)
                    const isSelected = index === selectedIndex

                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors",
                          isSelected && "bg-muted"
                        )}
                      >
                        <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {item.title}
                            </span>
                            {item.status && (
                              <span className={cn("text-xs px-2 py-0.5 rounded-full bg-muted", getStatusColor(item.status))}>
                                {item.status}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>↑↓ para navegar</span>
                <span>↵ para selecionar</span>
                <span>⎋ para fechar</span>
              </div>
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>+K para abrir</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Utility functions
const formatPhone = (phone) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`
  }
  return phone
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export { CommandPalette }
