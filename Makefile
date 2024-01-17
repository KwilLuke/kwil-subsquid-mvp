.DEFAULT_GOAL := help

KWIL_PROVIDER=http://localhost:8080

.PHONY: help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

generate-private-key: ## Generate a random ethereum private key.
	@which openssl > /dev/null || (echo "openssl not found! Please install openssl."; exit 1)
	@openssl rand -hex 32

kwild-start: ## Start kwil daemon.
	$(MAKE) _check-kwild
	@kwild --autogen

kwil-cli-configure: ## Configure kwil-cli.
	$(MAKE) _check-kwil
	@kwil-cli configure

deploy-schema: ## Deploy schema to local Kwil node.
	$(MAKE) _check-kwil
	@kwil-cli database deploy -p='./kwil_schema.kf'

drop-schema: ## Drop schema from local Kwil node.
	$(MAKE) _check-kwil
	@kwil-cli database drop test_subsquid

check-tx: ## Check transaction status.
	$(MAKE) _check-kwil
	@kwil-cli utils query-tx $(hash)

start-squid: ## Start indexer and data storage to Kwil.
	$(MAKE) _check-sqd
	@cd kwil-squid-demo && sqd up && sqd process

count-records: ## Count the records deployed to the test database.
	$(MAKE) _check-kwil
	@kwil-cli database call -a=count_transfers -n=test_subsquid

install: ## Install dependencies in kwil-squid-demo and kwil-subsquid-adapter. Compile typescript in kwil-subquid-adapter.
	@cd kwil-squid-demo && npm install
	@cd kwil-subsquid-adapter && npm install && npm run build

chain-id: ## Retrieve the chain id for the connected kwil chain
	$(MAKE) _check-kwil
	@kwil-cli utils chain-info --kwil-provider $(KWIL_PROVIDER)

_check-kwil: ## Check if kwil is installed.
	@which kwil-cli > /dev/null || (echo "kwil-cli not found! Please install kwil cli."; exit 1)

_check-sqd: ## Check if subsquid is installed.
	@which sqd > /dev/null || (echo "squid not found! Please install Squid Cli:  "; exit 1)

_check-kwild: ## Check if kwild is installed.
	@which kwild > /dev/null || (echo "kwil daemon not found! Please install kwil daemon."; exit 1)