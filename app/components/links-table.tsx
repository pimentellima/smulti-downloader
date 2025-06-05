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
import { useLocale } from '@/hooks/locale'
import type { Job } from '@/lib/api'
import { BASE_URL } from '@/lib/constants'
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
    Loader2,
    RefreshCw,
    XIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'
import DownloadButton from './download-button'
import FormatSelector, { type FormatOption } from './format-selector'

type JobFormatInfo = {
    jobId: string
    formatId: string
}

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
    const [selectedFormats, setSelectedFormats] = useState<JobFormatInfo[]>([])
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

    const onSelectFormat = (format: FormatOption, jobId: string) => {
        setSelectedFormats([
            ...selectedFormats.filter((job) => job.jobId !== jobId),
            { jobId, formatId: format.formatId },
        ])
    }
    const columns: ColumnDef<Job>[] = useMemo(
        () => [
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
                    const formatInfo = selectedFormats.find(
                        (jobWithUrl) => jobWithUrl.jobId === job.id
                    )
                    const formatOptions = job.formats

                    return (
                        <div className="flex gap-1 w-min">
                            <FormatSelector
                                formatOptions={formatOptions}
                                selectedFormat={formatOptions.find(
                                    (format) =>
                                        format.formatId === formatInfo?.formatId
                                )}
                                disabled={job.status !== 'ready'}
                                onSelect={(format) =>
                                    onSelectFormat(format, job.id)
                                }
                            />
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
                            ) : (
                                <DownloadButton
                                    size={'icon'}
                                    variant={'outline'}
                                    downloadLink={`${BASE_URL}api//single?formatId=${formatInfo?.formatId}&jobId=${job.id}`}
                                    disabled={
                                        job.status !== 'ready' ||
                                        !formatInfo?.formatId
                                    }
                                />
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
        ],
        [data, selectedFormats]
    )

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
