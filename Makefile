include ./Makefile_common.mk


.PHONY: build-local
build-local:
	cd backend &&\
 		make build-base &&\
 		make build-api &&\
 		make build-worker &&\
 		cd ../frontend &&\
 		make build-ui


.PHONY: run-local
run-local:
	open http://localhost:8080 && docker-compose -f docker-compose.all.yaml up --build


.PHONY: run-local-apps
run-local-apps:
	open http://localhost:8080 && docker-compose -f docker-compose.apps.yaml up --build


.PHONY: build-run-local
build-run-local: build-local run-local
