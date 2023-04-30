include ../Makefile_common.mk


UI_V := `grep -E "^\s+\"version\": \"[0-9]+?\.[0-9]+?\.[0-9]+?\",$$" package.json | grep -Eo "[0-9]+?\.[0-9]+?\.[0-9]+?"`

.PHONY: build-ui
build-ui:
	docker build \
		--build-arg REACT_APP_API_URL=http://localhost:8000 \
		-t $(REGISTRY)/logo-ui:$(UI_V) \
		.
