APP ?= greenmobility-radar
ENV ?= local
CONFIG_DIR ?= config

dev:
	set -o allexport && . "$(CONFIG_DIR)/$(ENV).secret.env" && gin -i -b $(APP) -p 8000 -a 8001 -d cmd/service
.PHONY: dev

run:
	set -o allexport && . "$(CONFIG_DIR)/$(ENV).secret.env" && go run $(shell ls cmd/service/*.go | grep -v "_test\.go")
.PHONY: run
