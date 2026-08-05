.PHONY: build serve clean check deploy

## build: render content/ + templates/ into dist/
build:
	go run ./cmd/build

## serve: build then preview on http://localhost:8080
serve:
	go run ./cmd/build -serve

## check: vet the generator and confirm the site builds
check:
	go vet ./...
	go run ./cmd/build
	@test -f dist/index.html || (echo "no dist/index.html" && exit 1)
	@echo "ok"

## clean: remove build output
clean:
	rm -rf dist

## deploy: push main; GitHub Actions builds and publishes to Pages
deploy: check
	git push origin main
