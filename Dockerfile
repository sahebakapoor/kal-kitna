FROM python:3.11-slim

# LightGBM needs the OpenMP runtime, which slim images don't include
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1

# Dependencies first: cached until pyproject.toml or uv.lock change
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

# Then the code and the serving bundle
COPY src ./src
RUN uv sync --frozen --no-dev
# Public image: simulated demo stores + Lab summary only, never real data rows
COPY models/demo ./models/demo
COPY models/lab.json ./models/lab.json
ENV KAL_KITNA_BUNDLE=models/demo

# Never run as root
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["/app/.venv/bin/uvicorn", "kal_kitna.api:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
