FROM public.ecr.aws/lambda/python:3.11

RUN yum install -y postgresql-devel gcc python3-devel

COPY process-handler.py ${LAMBDA_TASK_ROOT}/handlers/process-handler.py

COPY requirements.txt .
COPY cookies.txt .

RUN pip3 install -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

CMD ["handlers/process-handler.lambda_handler"]