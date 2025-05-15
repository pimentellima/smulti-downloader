'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { BASE_URL } from '@/lib/base-url'
import type { Job } from '@/lib/db'
import { useLocale } from '@/lib/hooks'
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    type ColumnDef,
} from '@tanstack/react-table'
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    RefreshCw,
    XIcon,
} from 'lucide-react'

interface LinksTableProps {
    data: Job[]
    isLoading: boolean
    onRetry: (jobId: string) => void
    isRetrying: Record<string, boolean>
    onRemoveJob: (jobId: string) => void
}

const tableDictionary = {
    'en-US': {
        title: 'Title',
        status: 'Status',
        actions: 'Actions',
        delete: 'Delete',
        queued: 'Queued',
        processing: 'Processing',
        ready: 'Ready',
        error: 'Error',
        retry: 'Retry',
        retrying: 'Retrying...',
        download: 'Download',
        noResults: 'No results.',
        pageInfo: (currentPage: number, pageCount: number, itemCount: number) =>
            `Page ${currentPage} of ${pageCount} • ${itemCount} items`,
        previousPage: 'Previous page',
        nextPage: 'Next page',
    },
    'pt-BR': {
        title: 'Título',
        status: 'Status',
        actions: 'Ações',
        delete: 'Excluir',
        queued: 'Na fila',
        processing: 'Processando',
        ready: 'Pronto',
        error: 'Erro',
        retry: 'Tentar novamente',
        retrying: 'Tentando novamente...',
        download: 'Baixar',
        noResults: 'Nenhum resultado.',
        pageInfo: (currentPage: number, pageCount: number, itemCount: number) =>
            `Página ${currentPage} de ${pageCount} • ${itemCount} itens`,
        previousPage: 'Página anterior',
        nextPage: 'Próxima página',
    },
}

export function LinksTable({
    data,
    isLoading,
    isRetrying,
    onRetry,
    onRemoveJob,
}: LinksTableProps) {
    const locale = useLocale()
    const dictionary = tableDictionary[locale] || tableDictionary['en-US']

    const getStatusBadge = (status: Job['status']) => {
        switch (status) {
            case 'error':
                return (
                    <Badge variant="destructive">{getStatusText(status)}</Badge>
                )
            case 'ready':
                return (
                    <Badge variant="secondary">{getStatusText(status)}</Badge>
                )
            case 'processing':
                return (
                    <Badge variant="outline">
                        {getStatusText(status)}{' '}
                        <Loader2 className="h-3 w-3 animate-spin" />
                    </Badge>
                )
            default:
                return (
                    <Badge variant="secondary">{getStatusText(status)}</Badge>
                )
        }
    }

    const getStatusText = (status: Job['status']) => {
        switch (status) {
            case 'queued':
                return dictionary.queued
            case 'processing':
                return dictionary.processing
            case 'ready':
                return dictionary.ready
            case 'error':
                return dictionary.error
            default:
                return status
        }
    }

    const columns: ColumnDef<Job>[] = [
        {
            accessorKey: 'status',
            header: dictionary.status,
            cell: ({ row }) => getStatusBadge(row.original.status),
            size: 50,
        },
        {
            id: 'actions',
            header: dictionary.actions,
            cell: ({ row }) => {
                const job = row.original
                const isJobRetrying = isRetrying[job.id] || false

                return (
                    <div className="flex gap-1 w-min">
                        {job.status === 'error' ? (
                            <Button
                                variant="outline"
                                size="sm"
                                title={
                                    isJobRetrying
                                        ? dictionary.retrying
                                        : dictionary.retry
                                }
                                onClick={() => onRetry(job.id)}
                                disabled={isJobRetrying}
                            >
                                {isJobRetrying ? (
                                    <Loader2 className="h-4 w-4  animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 " />
                                )}
                            </Button>
                        ) : job.status !== 'ready' ? (
                            <Button
                                title={dictionary.download}
                                disabled
                                variant="outline"
                                size="icon"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                title={dictionary.download}
                                variant="outline"
                                size="icon"
                                asChild
                            >
                                <a
                                    download
                                    href={`${BASE_URL}/api/processed-audios/single/${job.id}`}
                                >
                                    <Download className="h-4 w-4" />
                                </a>
                            </Button>
                        )}
                        <Button
                            size="icon"
                            title={dictionary.delete}
                            onClick={() => onRemoveJob(job.id)}
                            variant={'outline'}
                        >
                            <XIcon />
                        </Button>
                    </div>
                )
            },
            size: 25,
            maxSize: 25,
        },
        {
            accessorKey: 'title',
            header: dictionary.title,
            cell: ({ row }) => {
                return (
                    <div>
                        <div className="font-medium truncate">
                            {row.original.title || 'Untitled'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                            {row.original.url}
                        </div>
                    </div>
                )
            },
            minSize: 700,
            maxSize: 500,
            size: 200,
        },
    ]

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 20,
            },
        },
    })

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading &&
                            table.getRowModel().rows.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        {dictionary.noResults}
                                    </TableCell>
                                </TableRow>
                            )}
                        {!isLoading &&
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && 'selected'
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                    {dictionary.pageInfo(
                        table.getState().pagination.pageIndex + 1,
                        table.getPageCount(),
                        data.length
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">
                            {dictionary.previousPage}
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">{dictionary.nextPage}</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
