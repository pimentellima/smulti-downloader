FROM node:18-alpine AS builder

RUN apk add --no-cache ffmpeg

FROM public.ecr.aws/lambda/nodejs:22

COPY --from=builder /usr/bin/ffmpeg /usr/bin/ffmpeg

COPY dist/handler.js .
COPY dist/handler.js.map .

CMD [ "handler.handler" ]
