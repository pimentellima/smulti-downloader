import { ApiError } from '@shared/errors'
import { createStreamForJobFormat, getJobOrThrow } from '@shared/api'
import { downloadJobByIdSchema } from '@validations/schemas/job'
import { Router } from 'express'

const downloadRoute = Router()

downloadRoute.get('/single', async (req, res, next) => {
    try {
        const { formatId, jobId } = downloadJobByIdSchema.parse(req.query)
        const job = await getJobOrThrow(jobId)
        const format = job.formats.find((f) => f.formatId === formatId)
        if (!format) {
            throw new ApiError({
                code: 'not_found',
                message: 'Format not found for this job',
            })
        }

        const { ext, stream, title } = await createStreamForJobFormat(
            job,
            format,
        )
        res.setHeader('Content-Type', `application/octet-stream`)
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${title}.${ext}"`,
        )
        stream.pipe(res)
    } catch (err) {
        next(err)
    }
})

export default downloadRoute
