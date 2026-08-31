"""
Global FastAPI Exception Handlers for Amanah Madinah Platform.

Translates domain exceptions and validation errors into unified bilingual JSON responses
with request correlation IDs.
"""

import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.exceptions import AppException
from app.logging_config import request_id_ctx

logger = logging.getLogger("app.error_handlers")


def register_error_handlers(app: FastAPI):
    """Registers all global exception handlers on the FastAPI application."""

    # 1. Handle Domain-specific AppExceptions
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        req_id = request_id_ctx.get()
        logger.warning(
            f"Domain Exception [{exc.error_code}] on {request.method} {request.url.path}: {exc.message_en}",
            extra={"extra_data": {"details": exc.details, "error_code": exc.error_code}}
        )

        response_content = exc.to_dict()
        response_content["error"]["request_id"] = req_id

        return JSONResponse(
            status_code=exc.status_code,
            content=response_content,
            headers={"X-Request-ID": req_id}
        )

    # 2. Handle Pydantic Request Validation Errors (FastAPI 422)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = request_id_ctx.get()

        # Format validation errors into clean structured list
        formatted_errors = []
        for err in exc.errors():
            loc = " -> ".join([str(l) for l in err.get("loc", []) if l != "body"])
            msg = err.get("msg", "Invalid value")
            formatted_errors.append({"field": loc or "payload", "issue": msg, "type": err.get("type", "")})

        logger.warning(
            f"Validation Error on {request.method} {request.url.path}: {len(formatted_errors)} field issue(s)",
            extra={"extra_data": {"validation_errors": formatted_errors}}
        )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "REQUEST_VALIDATION_ERROR",
                    "message": "The submitted payload contains validation errors.",
                    "message_ar": "البيانات المرسلة تحتوي على حقول غير مطابقة للشروط المطلوبة.",
                    "status_code": 422,
                    "request_id": req_id,
                    "fields": formatted_errors
                }
            },
            headers={"X-Request-ID": req_id}
        )

    # 3. Handle Standard HTTPExceptions (404, 405, etc.)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        req_id = request_id_ctx.get()

        # If already an API route 404 or other HTTP error
        if exc.status_code != 404:
            logger.warning(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": str(exc.detail) if exc.detail else "HTTP Error",
                    "message_ar": "تعذر تنفيذ الطلب.",
                    "status_code": exc.status_code,
                    "request_id": req_id
                }
            },
            headers={"X-Request-ID": req_id}
        )
