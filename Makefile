.PHONY: env dev

env:
	uv sync --locked

dev:
	uv run --locked zensical serve
