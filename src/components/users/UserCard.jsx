import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, Shield, Stethoscope, User, Mail, Phone, CheckCircle2, XCircle, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRoleConfig, ROLES } from '@/lib/permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roleIcons = {
  admin: Shield,
  medico: Stethoscope,
  atendimento: User,
};

const UserCard = ({ user, onEdit, onDelete, currentUserId }) => {
  const roleConfig = getRoleConfig(user.role);
  const RoleIcon = roleIcons[user.role] || User;

  const initials =
    user.full_name
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const isCurrentUser = currentUserId === user.id;
  const isActive = true; // Todos os usuários são considerados ativos por padrão

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{
        y: -5,
        boxShadow:
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }}
      className={`bg-card rounded-xl shadow-sm border p-6 relative ${!isActive ? 'opacity-60' : ''}`}
    >
      {/* Status Badge */}
      {isActive && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
            Ativo
          </Badge>
        </div>
      )}

      {/* Avatar e Informações */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center overflow-hidden border-2 border-border">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || 'Usuário'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary font-semibold text-lg">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg truncate">
              {user.full_name || 'Usuário sem nome'}
              {isCurrentUser && (
                <Badge variant="outline" className="ml-2 text-xs">Você</Badge>
              )}
            </h3>
            {user.email && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{user.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Badge */}
      <div className="mb-4">
        <Badge
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${roleConfig.color} border`}
        >
          <RoleIcon className="h-4 w-4" />
          {roleConfig.label}
        </Badge>
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {roleConfig.description}
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onEdit(user)}
          disabled={!isActive}
        >
          <Edit className="h-4 w-4 mr-1.5" />
          Editar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isCurrentUser}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar usuário
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(user.id)}
              className="text-destructive"
              disabled={isCurrentUser}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

export default UserCard;
