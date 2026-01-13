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
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Primary Row */}
              <div className="flex items-center gap-2">
                {columns[0]?.render ? (
                  columns[0].render(item[columns[0].accessorKey], item)
                ) : (
                  <span className="font-medium text-foreground truncate">
                    {item[columns[0]?.accessorKey] || '-'}
                  </span>
                )}

                {/* Status Badge */}
                {columns.find(col => col.isStatus)?.render(
                  item[columns.find(col => col.isStatus).accessorKey],
                  item
                )}
              </div>

              {/* Secondary Info */}
              <div className="space-y-1">
                {visibleColumns.slice(1, 3).map((column) => (
                  <div key={column.accessorKey} className="flex items-center gap-2 text-sm">
                    {column.header && (
                      <span className="text-muted-foreground font-medium">
                        {column.header}:
                      </span>
                    )}
                    {column.render ? (
                      column.render(item[column.accessorKey], item)
                    ) : (
                      <span className="text-foreground truncate">
                        {item[column.accessorKey] || '-'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional fields if many columns */}
              {visibleColumns.length > 3 && (
                <div className="pt-2 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {visibleColumns.slice(3).map((column) => (
                      <div key={column.accessorKey} className="flex flex-col">
                        <span className="text-muted-foreground font-medium">
                          {column.header}
                        </span>
                        {column.render ? (
                          column.render(item[column.accessorKey], item)
                        ) : (
                          <span className="text-foreground truncate">
                            {item[column.accessorKey] || '-'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {actions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {actions.map((action, actionIndex) => (
                      <DropdownMenuItem
                        key={actionIndex}
                        onClick={() => action.onClick(item)}
                        className={cn(
                          "flex items-center gap-2",
                          action.variant === 'destructive' && "text-destructive focus:text-destructive"
                        )}
                      >
                        {action.icon && <action.icon className="h-4 w-4" />}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {onRowClick && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
