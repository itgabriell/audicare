import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SocialPostColumn from './SocialPostColumn';
import SocialPostCard from './SocialPostCard';

const SocialPostKanban = ({
  posts,
  onEditPost,
  onDeletePost,
  onUpdateStatus,
}) => {
  const columns = [
    { id: 'idea', title: '💡 Ideia' },
    { id: 'scripting', title: '📝 Roteiro' },
    { id: 'to_record', title: '🎬 Gravação' },
    { id: 'editing', title: '✂️ Edição' },
    { id: 'ready', title: '✅ Pronto' },
    { id: 'scheduled', title: '📅 Agendado' },
    { id: 'published', title: '🚀 Publicado' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimento antes de ativar o drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = React.useState(null);
  const activePost = activeId ? posts.find((p) => p.id === activeId) : null;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activePost = posts.find((p) => p.id === active.id);
    if (!activePost) return;

    // Se arrastou para uma coluna diferente, atualiza o status
    if (over.id !== activePost.status && columns.find((c) => c.id === over.id)) {
      onUpdateStatus(active.id, over.id);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {columns.map((column) => {
          const columnPosts = posts.filter((post) => post.status === column.id);
          return (
            <SortableContext
              key={column.id}
              id={column.id}
              items={columnPosts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <SocialPostColumn
                column={column}
                posts={columnPosts}
                onEditPost={onEditPost}
                onDeletePost={onDeletePost}
                onUpdateStatus={onUpdateStatus}
              />
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay>
        {activePost ? (
          <div className="opacity-90 rotate-2">
            <SocialPostCard
              post={activePost}
              onEdit={onEditPost}
              onDelete={onDeletePost}
              onUpdateStatus={onUpdateStatus}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default React.memo(SocialPostKanban);
