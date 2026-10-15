.PHONY: env dev build check publish

env:
	npm ci

dev:
	npm run dev

build:
	npm run build

publish:
	npm run publish

check:
	npm run test
	npm run typecheck
