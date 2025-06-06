FROM public.ecr.aws/lambda/python:3.11

RUN yum install -y postgresql-devel gcc python3-devel

COPY process-worker.py ${LAMBDA_TASK_ROOT}/workers/process-worker.py

COPY requirements.txt .
COPY cookies.txt .

RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

CMD ["workers/process-worker.lambda_handler"]