import { updateMergedFormatStatus } from '@shared/api'
import { EventBridgeEvent, Handler } from 'aws-lambda'

type MediaConvertJobStateChangeDetail = {
  status: 'SUBMITTED' | 'PROGRESSING' | 'COMPLETE' | 'ERROR',
  mergedFormatId: string,
  userMetadata?: Record<string, string>,
}

export const updateJobStatus: Handler = async (
    event: EventBridgeEvent<
        'MediaConvert Job State Change',
        MediaConvertJobStateChangeDetail
    >,
) => {
    const detail = event.detail
    const status = detail.status
    const mergedFormatId =
        detail.userMetadata?.mergedFormatId || detail.mergedFormatId

    if (!mergedFormatId) {
        console.warn('MergedFormat id não encontrado no evento.')
        return
    }

    if (status === 'COMPLETE') {
        await updateMergedFormatStatus(mergedFormatId, 'converted')
    } else if (status === 'ERROR') {
        await updateMergedFormatStatus(mergedFormatId, 'error-converting')
    }
}
