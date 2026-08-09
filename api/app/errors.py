import re
from http import HTTPStatus

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException


def _slug(value: str) -> str:
    code = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return code or "error"


def _default_message(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Error"


def _normalize_detail(detail, status_code: int) -> dict:
    if isinstance(detail, dict):
        message = detail.get("message") or _default_message(status_code)
        code = detail.get("code") or _slug(message)
        normalized = {"code": code, "message": message}
        for key, value in detail.items():
            if key not in {"code", "message"}:
                normalized[key] = value
        return normalized

    if isinstance(detail, str):
        return {"code": _slug(detail), "message": detail}

    return {
        "code": _slug(_default_message(status_code)),
        "message": _default_message(status_code),
        "error": detail,
    }


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": jsonable_encoder(_normalize_detail(exc.detail, exc.status_code))},
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        sanitized = dict(error)
        if "ctx" in sanitized:
            sanitized["ctx"] = {
                key: str(value)
                for key, value in sanitized["ctx"].items()
            }
        errors.append(sanitized)

    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "code": "validation_error",
                "message": "Invalid request",
                "errors": jsonable_encoder(errors),
            }
        },
    )


async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": {
                "code": "rate_limit_exceeded",
                "message": "Too many requests",
                "limit": str(exc.detail),
            }
        },
    )
