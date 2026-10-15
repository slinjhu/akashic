.PHONY: env dev build check

env:
	npm ci

dev:
	npm run dev

build:
	npm run build

check:
	npm run test
	npm run typecheck
