import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu"

const DataTableMobile = React.forwardRef(({
  data,
  columns,
  onRowClick,
  actions,
  className,
  ...props
}, ref) => {
  const visibleColumns = columns.filter(col => !col.hideOnMobile)

  return (
    <div ref={ref} className={cn("space-y-3", className)} {...props}>
      {data.map((item, index) => (
        <div
          key={item.id || index}
          className={cn(
            "bg-card rounded-lg border p-4 transition-all duration-200",
            "hover:shadow-md hover:border-primary/20 active:scale-[0.98]",
            onRowClick && "cursor-pointer"
          )}
          onClick={() => onRowClick?.(item)}
        >
          {/* Main Content */}
          <div className="flex flex-col gap-3">
            {/* Header with Name and Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {columns[0]?.render ? (
                  columns[0].render(item[columns[0].accessorKey], item)
                ) : (
                  <span className="font-bold text-lg text-foreground break-words leading-tight">
                    {item[columns[0]?.accessorKey] || '-'}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              {columns.find(col => col.isStatus) && (
                <div className="flex-shrink-0">
                  {columns.find(col => col.isStatus).render(
                    item[columns.find(col => col.isStatus).accessorKey],
                    item
                  )}
                </div>
              )}
            </div>

            {/* Secondary Info Row */}
            <div className="flex flex-col gap-1 text-sm">
              {visibleColumns.slice(1, 3).map((column) => (
                <div key={column.accessorKey} className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium min-w-[50px] flex-shrink-0">
                    {column.header === 'CPF' ? 'CPF:' : column.header === 'Telefone' ? 'Tel:' : `${column.header}:`}
                  </span>
                  <div className="flex-1 min-w-0">
                    {column.render ? (
                      column.render(item[column.accessorKey], item)
                    ) : (
                      <span className="text-foreground break-words">
                        {item[column.accessorKey] || '-'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
              {actions && actions.map((action, actionIndex) => (
                <Button
                  key={actionIndex}
                  variant="outline"
                  size="sm"
                  onClick={() => action.onClick(item)}
                  className={cn(
                    "flex-1 min-h-[44px] text-sm font-medium",
                    action.variant === 'destructive' && "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  )}
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              ))}

              {/* WhatsApp Button if phone exists */}
              {item.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    const phone = item.phone.replace(/\D/g, '');
                    window.open(`https://wa.me/55${phone}`, '_blank');
                  }}
                >
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})
DataTableMobile.displayName = "DataTableMobile"

export { DataTableMobile }
