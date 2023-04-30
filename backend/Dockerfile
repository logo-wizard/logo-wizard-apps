FROM cr.yandex/crp565ee772968cfkcmt/logo-base-base-image:latest as base

ENV PATH=/root/.local/bin:$PATH

COPY . /code
WORKDIR /code

RUN pip install --user \
  ./lib/logo_configs \
  ./app/logo_api \
  ./app/logo_worker
