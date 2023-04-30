ARG BASE_IMG_VERSION=latest
FROM cr.yandex/crp565ee772968cfkcmt/logo-base-image:${BASE_IMG_VERSION} as builder

WORKDIR /code/app/logo_worker
COPY . .

ENTRYPOINT ["python", "logo_worker/app.py"]
