import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getRoleConfig, getAvailableRoles } from '@/lib/permissions';
import { Shield, Stethoscope, User, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';

const roleIcons = {
  admin: Shield,
  medico: Stethoscope,
  atendimento: User,
};

const UserDialog = ({ open, onOpenChange, user, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'atendimento',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const availableRoles = getAvailableRoles();

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'atendimento',
        phone: user.phone || '',
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'atendimento',
        phone: '',
      });
    }
    setErrors({});
    setShowPassword(false);
  }, [user, open]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório';
    }
    
    if (!user && !formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório para novos usuários';
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    if (!user && !formData.password) {
      newErrors.password = 'Senha é obrigatória para novos usuários';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSave(formData);
  };

  const selectedRoleConfig = getRoleConfig(formData.role);
  const RoleIcon = roleIcons[formData.role] || User;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? 'Atualize as informações do colaborador'
              : 'Adicione um novo colaborador ao sistema'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Ex: João Silva"
                  className={errors.full_name ? 'border-destructive' : ''}
                />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  E-mail {!user && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="usuario@audicare.com"
                  disabled={!!user}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
                {user && (
                  <p className="text-xs text-muted-foreground">
                    E-mail não pode ser alterado
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Perfil de Acesso */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Perfil de Acesso</h3>
            
            <div className="space-y-2">
              <Label htmlFor="role">
                Perfil <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => {
                    const Icon = roleIcons[role.value] || User;
                    return (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{role.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição do Perfil Selecionado */}
            {selectedRoleConfig && (
              <Card className={`${selectedRoleConfig.color} border`}>
                <div className="flex items-start gap-3 p-4">
                  <RoleIcon className="h-5 w-5 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{selectedRoleConfig.label}</div>
                    <p className="text-sm opacity-90">
                      {selectedRoleConfig.description}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Senha */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              {user ? 'Alterar Senha' : 'Senha de Acesso'}
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="password">
                Senha {!user && <span className="text-destructive">*</span>}
                {user && <span className="text-muted-foreground">(deixe em branco para não alterar)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={user ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
              {!user && (
                <p className="text-xs text-muted-foreground">
                  A senha será enviada por e-mail ao usuário
                </p>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {user ? 'Salvar Alterações' : 'Criar Colaborador'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
