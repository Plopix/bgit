# Styles
YELLOW := $(shell echo "\033[00;33m")
RED := $(shell echo "\033[00;31m")
RESTORE := $(shell echo "\033[0m")

# Variables
.DEFAULT_GOAL := list
PACKAGE_MANAGER := bun
CURRENT_DIR := $(shell pwd)
DEPENDENCIES := bun git

.PHONY: list
list:
	@echo "${YELLOW}***${RED}***${RESTORE}***${YELLOW}***${RED}***${RESTORE}***${YELLOW}***${RED}***${RESTORE}***${YELLOW}***${RED}***${RESTORE}"
	@echo "${RED}BGIT: ${YELLOW}Available targets${RESTORE}:"
	@grep -E '^[a-zA-Z-]+:.*?## .*$$' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf " ${YELLOW}%-15s${RESTORE} > %s\n", $$1, $$2}'
	@echo "${RED}=================================${RESTORE}"

.PHONY: check-dependencies
check-dependencies:
	@for dependency in $(DEPENDENCIES); do \
		if ! command -v $$dependency &> /dev/null; then \
			echo "${RED}Error:${RESTORE} ${YELLOW}$$dependency${RESTORE} is not installed."; \
			exit 1; \
		fi; \
	done
	@echo "All ${YELLOW}dependencies are installed.${RESTORE}"

.env:
	@cp .env.dist .env
	@echo "${YELLOW}Please fill the .env file.${RESTORE}"

.PHONY: .env install
install: check-dependencies update ## Install the Application and reset the database

.PHONY: update
update: check-dependencies ## Update the Repo
	@$(PACKAGE_MANAGER) install
	
.PHONY: build
build: ## Build All
	@cp ./src/ui/styles.css ./src/ui/styles.tcss
	@$(PACKAGE_MANAGER) x tailwindcss -i ./src/ui/styles.tcss -o ./src/ui/styles.css --minify
	@$(PACKAGE_MANAGER) build src/server.ts --compile --outfile ./bgit
	@rm -f .*.bun-build
	@mv ./src/ui/styles.tcss ./src/ui/styles.css

.PHONY: build-all
build-all: ## Build All the CLIs	
	@cp ./src/ui/styles.css ./src/ui/styles.tcss
	@$(PACKAGE_MANAGER) x tailwindcss -i ./src/ui/styles.tcss -o ./src/ui/styles.css --minify
	@for target in bun-linux-x64 bun-linux-arm64 bun-windows-x64 bun-darwin-x64 bun-darwin-arm64; do \
		$(PACKAGE_MANAGER) build src/server.ts --compile --outfile bgit-$$target --target=$$target; \
	done
	@rm -f .*.bun-build
	@mv ./src/ui/styles.tcss ./src/ui/styles.css

.PHONY: deploy
deploy: build-all ## Deploy
	@for target in bun-linux-x64 bun-linux-arm64 bun-darwin-x64 bun-darwin-arm64; do \
		scp bgit-$$target root@plopix.net:/var/www/html/plopix/www.plopix.net/wwwroot/static/neon/; \
	done
	@scp bgit-bun-windows-x64.exe root@plopix.net:/var/www/html/plopix/www.plopix.net/wwwroot/static/neon/
	@scp src/install.bash root@plopix.net:/var/www/html/plopix/www.plopix.net/wwwroot/static/neon/
	@$(MAKE) clean

.PHONY: serve
serve: ## Serve the application
	@LOG_LEVELS=debug,info ./src/server.ts serve

.PHONY: clean
clean: ## Clean
	@rm -f bgit
	@rm -f bgit-bun-darwin-x64
	@rm -f bgit-bun-darwin-arm64
	@rm -f bgit-bun-linux-x64
	@rm -f bgit-bun-linux-arm64
	@rm -f bgit-bun-windows-x64.exe
	@rm -f .*.bun-build

.PHONY: codeclean
codeclean: ## Code Clean
	@$(PACKAGE_MANAGER) x prettier --write .
	@$(PACKAGE_MANAGER) x prettier --check .

.PHONY: tests
tests: ## Run All the Tests
	@$(PACKAGE_MANAGER) run test
