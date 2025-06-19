FROM public.ecr.aws/lambda/nodejs20.x

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /var/task

COPY dist/handler.js .

CMD [ "handler.handler" ]