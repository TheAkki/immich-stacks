# SPDX-License-Identifier: GPL-3.0-or-later
NPM ?= npm

.PHONY: test coverage lint check

test:
	$(NPM) test

coverage:
	$(NPM) run coverage

lint:
	$(NPM) run lint

check: lint coverage
