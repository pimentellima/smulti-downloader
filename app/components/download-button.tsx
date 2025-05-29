import { useLocale } from '@/hooks/locale'
import { Button } from './ui/button'
import { BASE_URL } from '@/lib/constants'
import { Download, DownloadIcon, InfoIcon, LoaderCircle } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

interface DownloadButtonProps {
    disabled?: boolean
    size?: ComponentProps<typeof Button>['size']
    variant?: ComponentProps<typeof Button>['variant']
    description?: string
    downloadLink: string
}

const dictionary = {
    'en-US': {
        download: 'Download',
        error: 'An error occurred while downloading. Please try again.',
    },
    'pt-BR': {
        download: 'Baixar',
        error: 'Ocorreu um erro ao baixar. Por favor, tente novamente.',
    },
}

export default function DownloadButton({
    disabled,
    size,
    variant,
    description,
    downloadLink,
}: DownloadButtonProps) {
    const locale = useLocale()
    const [isDownloading, setIsDownloading] = useState(false)
    const [isError, setIsError] = useState(false)

    const onDownload = async () => {
        setIsError(false)
        setIsDownloading(true)
        try {
            const response = await fetch(downloadLink)
            if (!response.ok) {
                setIsError(true)
                throw new Error('Failed to download file')
            }
            const url = await response.text()
            const link = document.createElement('a')
            link.href = url
            link.download = ''
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (e) {
            setIsError(true)
        } finally {
            setIsDownloading(false)
        }
    }

    const isDisabled = disabled || isDownloading

    return (
        <Button
            title={
                isError ? dictionary[locale].error : dictionary[locale].download
            }
            variant={isError ? 'destructive' : variant}
            size={size}
            disabled={isDisabled}
            onClick={onDownload}
            className="group"
        >
            {isError ? (
                <div className="relative flex items-center justify-center">
                    <InfoIcon className=" absolute group-hover:opacity-0 transition-opacity h-4 w-4" />
                    <DownloadIcon className=" absolute opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4" />
                </div>
            ) : isDownloading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
                <DownloadIcon className="h-4 w-4" />
            )}
            {!!description && <p className=" ml-1">{description}</p>}
        </Button>
    )
}
