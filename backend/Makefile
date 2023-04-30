include ../Makefile_common.mk


WORKER_V := $(shell grep -E "__version__ = " app/logo_worker/setup.py | grep -Eo "[0-9]+?\.[0-9]+?\.[0-9]+?")
API_V := $(shell grep -E "__version__ = " app/logo_api/setup.py | grep -Eo "[0-9]+?\.[0-9]+?\.[0-9]+?")

####################################################################################################

.PHONY: sync-reqs
sync-reqs:
	cp requirements.txt requirements.txt.bak
	pip freeze > requirements.txt
	sed -i.bak '/logo_/d' ./requirements.txt


.PHONY: local-dev
local-dev:
	rm -rf ../venv
	python3 -m virtualenv ../venv
	source ../venv/bin/activate \
		&& pip install -e \
			"./app/logo_worker" \
			"./app/logo_api[develop]" \
			"./lib/logo_configs" \
		&& $(MAKE) sync-reqs \
		&& pip install -r requirements.txt

####################################################################################################

.PHONY: build-base-base
build-base-base:
	 docker build -f Dockerfile.base -t $(REGISTRY)/logo-base-base-image:latest .


.PHONY: build-base
build-base:
	 docker build -t $(REGISTRY)/logo-base-image:latest .

####################################################################################################

.PHONY: build-worker
build-worker:
	cd app/logo_worker && docker build -t $(REGISTRY)/logo-worker:$(WORKER_V) .


.PHONY: run-worker
run-worker:
	docker run --env-file .env -v /Users/konstasa/.redis:/certs $(REGISTRY)/logo-worker:$(WORKER_V)


.PHONY: run-worker-full
run-worker-full: build-base build-worker run-worker

####################################################################################################

.PHONY: build-api
build-api:
	cd app/logo_api && docker build -t $(REGISTRY)/logo-api:$(API_V) .


.PHONY: run-api
run-api:
	docker run --env-file .env -v /Users/konstasa/.redis:/certs $(REGISTRY)/logo-api:$(API_V)


.PHONY: run-api-full
run-api-full: build-base build-api run-api
