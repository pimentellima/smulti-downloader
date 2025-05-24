import { Check, ChevronDown, FileAudio, FileVideo } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import type { Format, JsonData } from '@/lib/schemas/job'
import { useLocale } from '@/hooks/locale'
import { Badge } from './ui/badge'

interface FormatSelectosProps {
    formats_audio: JsonData['formats_audio']
    formats_video: JsonData['formats_video']
    onSelect: (format: Format) => void
    selectedFormat: Format | undefined
    disabled?: boolean
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
    formats_audio,
    formats_video,
    onSelect,
    disabled,
    selectedFormat
}: FormatSelectosProps) {
    const locale = useLocale()

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
        else return (bytes / 1073741824).toFixed(1) + ' GB'
    }

    const isHighQuality = (format: Format) => {
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
            const aWidth = parseInt(a.resolution.split('x')[0], 10)
            const bWidth = parseInt(b.resolution.split('x')[0], 10)
            return bWidth - aWidth
        })
    }, [formats_video])
    const audioFormatsSorted = useMemo(() => {
        return formats_audio.sort((a, b) => {
            return a.filesize - b.filesize
        })
    }, [formats_audio])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button disabled={disabled} variant="outline" className="justify-between w-min">
                    {selectedFormat ? (
                        <span className="flex items-center gap-2">
                            {selectedFormat.resolution ? (
                                <FileVideo className="h-4 w-4" />
                            ) : (
                                <FileAudio className="h-4 w-4" />
                            )}
                            {selectedFormat.resolution
                                ? `${
                                      selectedFormat.ext
                                  } (${formatFileResolution(
                                      selectedFormat.resolution
                                  )})`
                                : `${selectedFormat.ext} (Áudio)`}
                            <span className="text-muted-foreground text-xs">
                                {formatFileSize(selectedFormat.filesize)}
                            </span>
                        </span>
                    ) : (
                        formatDictionary[locale].format
                    )}
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-h-[300px] overflow-y-auto">
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
                                        {format.ext} (
                                        {formatFileResolution(
                                            format.resolution
                                        )}
                                        )
                                        {isHighQuality(format) && (
                                            <span className="ml-1 text-xs font-bold text-primary">
                                                HD
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex gap-1">
                                        <span className="text-muted-foreground text-xs">
                                            {formatFileSize(format.filesize)}
                                        </span>
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
                                    <span>
                                        {format.ext} 
                                    </span>
                                    <div className="flex gap-1">
                                        <span className="text-muted-foreground text-xs">
                                            {formatFileSize(format.filesize)}
                                        </span>
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
