import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import SocialPostCard from './SocialPostCard';

const SocialPostColumn = ({
  column,
  posts,
  onEditPost,
  onDeletePost,
  onUpdateStatus,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const colorClasses = {
    idea: 'bg-slate-500/10 border-slate-500/20',
    scripting: 'bg-blue-500/10 border-blue-500/20',
    to_record: 'bg-yellow-500/10 border-yellow-500/20',
    editing: 'bg-orange-500/10 border-orange-500/20',
    ready: 'bg-green-500/10 border-green-500/20',
    scheduled: 'bg-sky-500/10 border-sky-500/20',
    published: 'bg-emerald-500/10 border-emerald-500/20',
  };

  const headerColorClasses = {
    idea: 'bg-slate-500',
    scripting: 'bg-blue-500',
    to_record: 'bg-yellow-500',
    editing: 'bg-orange-500',
    ready: 'bg-green-500',
    scheduled: 'bg-sky-500',
    published: 'bg-emerald-500',
  };

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border ${colorClasses[column.id] || 'bg-muted/50 border-border'
        } flex flex-col min-h-[500px] transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
        }`}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${headerColorClasses[column.id] || 'bg-muted-foreground'
                }`}
            />
            <h3 className="font-semibold text-foreground">{column.title}</h3>
          </div>
          <span className="text-sm text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {posts.length}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {isOver ? (
              <span className="text-primary font-medium">Solte aqui</span>
            ) : (
              'Nenhum post nesta etapa'
            )}
          </div>
        ) : (
          posts.map((post) => (
            <SocialPostCard
              key={post.id}
              post={post}
              onEdit={onEditPost}
              onDelete={onDeletePost}
              onUpdateStatus={onUpdateStatus}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(SocialPostColumn);
