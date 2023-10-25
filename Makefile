.DEFAULT_GOAL := help

.PHONY: help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

generate-private-key: ## Generate a random ethereum private key.
	@which openssl > /dev/null || (echo "openssl not found! Please install openssl."; exit 1)
	@openssl rand -hex 32

kwild-start: ## Start kwil daemon.
	@kwild --autogen

kwil-cli-configure: ## Configure kwil-cli.
	@kwil-cli configure

deploy-schema: ## Deploy schema to local Kwil node.
	@kwil-cli database deploy -p='./kwil_schema.kf'

drop-schema: ## Drop schema from local Kwil node.
	@kwil-cli database drop test_subsquid

check-tx: ## Check transaction status.
	@kwil-cli utils query-tx $(hash)

start-squid: ## Start indexer and data storage to Kwil.
	@cd kwil-squid-demo && sqd up && sqd process

count-records: ## Count the records deployed to the test database.
	@kwil-cli database call -a=count_transfers -n=test_subsquid

install: ## Install dependencies in kwil-squid-demo and kwil-subsquid-adapter. Compile typescript in kwil-subquid-adapter.
	@cd kwil-squid-demo && npm install
	@cd kwil-subsquid-adapter && npm install
	@cd kwil-subsquid-adapter && npm run build