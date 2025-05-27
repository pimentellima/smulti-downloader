import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/hooks/locale'
import { getLanguageLabel } from '@/lib/language-labels'
import { Check, ChevronDown, FileAudio, FileVideo } from 'lucide-react'
import { useMemo } from 'react'

interface FormatSelectosProps {
    onSelect: (format: FormatOption) => void
    formatOptions: FormatOption[]
    selectedFormat: FormatOption | undefined
    disabled?: boolean
}

export interface FormatOption {
    format_id: string
    ext: 'm4a' | 'webm' | 'mp4'
    resolution?: string
    acodec?: string
    vcodec?: string
    filesize?: number
    format_note?: string
    language?: string
}

const formatDictionary = {
    'pt-BR': {
        video: 'Vídeo',
        audio: 'Áudio',
        format: 'Formato',
    },
    'en-US': {
        video: 'Video',
        audio: 'Audio',
        format: 'Format',
    },
}

export default function FormatSelector({
    formatOptions,
    onSelect,
    disabled,
    selectedFormat,
}: FormatSelectosProps) {
    const locale = useLocale()
    const formats_audio = useMemo(
        () =>
            formatOptions.filter(
                (format) => format.acodec !== 'none' && format.vcodec === 'none'
            ),
        [formatOptions]
    )
    const formats_video = useMemo(
        () => formatOptions.filter((format) => format.vcodec !== 'none'),
        [formatOptions]
    )

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
        else return (bytes / 1073741824).toFixed(1) + ' GB'
    }

    const isHighQuality = (format: FormatOption) => {
        if (!format.resolution) return false
        const [width, height] = format.resolution.split('x')
        const widthNumber = parseInt(width, 10)
        const heightNumber = parseInt(height, 10)
        return widthNumber >= 1080 && heightNumber >= 720
    }

    const formatFileResolution = (resolution: string) => {
        const [_, height] = resolution.split('x')
        const heightNumber = parseInt(height, 10)
        return `${heightNumber}p`
    }

    const videoFormatsSorted = useMemo(() => {
        return formats_video.sort((a, b) => {
            if (!a.resolution || !b.resolution) return 0
            const aWidth = parseInt(a.resolution.split('x')[0], 10)
            const bWidth = parseInt(b.resolution.split('x')[0], 10)
            return bWidth - aWidth
        })
    }, [formats_video])

    const audioFormatsSorted = useMemo(() => {
        return formats_audio.sort((a, b) => {
            if (
                a.format_note?.includes('original') &&
                !b.format_note?.includes('original')
            )
                return -1
            if (
                !a.format_note?.includes('original') &&
                b.format_note?.includes('original')
            )
                return 1
            if (!a.filesize || !b.filesize) return 0
            return b.filesize - a.filesize
        })
    }, [formats_audio])

    const getFormatLabel = (format: FormatOption) => {
        if (format.resolution) {
            return `${format.ext} (${formatFileResolution(format.resolution)})`
        }
        if (format.language)
            return `${format.ext} ${getLanguageLabel(format.language)}`
        return `${format.ext}`
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    disabled={disabled}
                    variant="outline"
                    className="justify-between w-min"
                >
                    {selectedFormat ? (
                        <span className="flex items-center gap-2">
                            {selectedFormat.resolution ? (
                                <FileVideo className="h-4 w-4" />
                            ) : (
                                <FileAudio className="h-4 w-4" />
                            )}
                            {getFormatLabel(selectedFormat)}
                            {selectedFormat.filesize && (
                                <span className="text-muted-foreground text-xs">
                                    {formatFileSize(selectedFormat.filesize)}
                                </span>
                            )}
                        </span>
                    ) : (
                        formatDictionary[locale].format
                    )}
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-max max-h-[300px] overflow-y-auto">
                {videoFormatsSorted.length > 0 && (
                    <>
                        <DropdownMenuLabel>
                            <span className="flex items-center gap-2">
                                <FileVideo className="h-4 w-4" />
                                {formatDictionary[locale].video}
                            </span>
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            {videoFormatsSorted.map((format) => (
                                <DropdownMenuItem
                                    key={format.format_id}
                                    onClick={() => {
                                        onSelect(format)
                                    }}
                                    className="flex justify-between text-sm"
                                >
                                    <span>
                                        {getFormatLabel(format)}
                                        {isHighQuality(format) && (
                                            <span className="ml-1 text-xs font-bold text-primary">
                                                HD
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex gap-1">
                                        {format.filesize && (
                                            <span className="text-muted-foreground text-xs">
                                                {formatFileSize(
                                                    format.filesize
                                                )}
                                            </span>
                                        )}
                                        {selectedFormat?.format_id ===
                                            format.format_id && (
                                            <Check className="h-4 w-4 ml-2" />
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </>
                )}

                {formats_audio.length > 0 && formats_video.length > 0 && (
                    <DropdownMenuSeparator />
                )}

                {audioFormatsSorted.length > 0 && (
                    <>
                        <DropdownMenuLabel>
                            <span className="flex items-center gap-2">
                                <FileAudio className="h-4 w-4" />
                                {formatDictionary[locale].audio}
                            </span>
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            {audioFormatsSorted.map((format) => (
                                <DropdownMenuItem
                                    key={format.format_id}
                                    onClick={() => {
                                        onSelect(format)
                                    }}
                                    className="flex justify-between text-sm"
                                >
                                    {getFormatLabel(format)}
                                    <div className="flex gap-1">
                                        {format.filesize && (
                                            <span className="text-muted-foreground text-xs">
                                                {formatFileSize(
                                                    format.filesize
                                                )}
                                            </span>
                                        )}
                                        {selectedFormat?.format_id ===
                                            format.format_id && (
                                            <Check className="h-4 w-4 ml-2" />
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
