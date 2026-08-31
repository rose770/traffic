"""
Domain Exception Hierarchy and Standardized Error Taxonomy for Amanah Madinah Platform.

Provides bilingual (Arabic & English) error messages, standard machine-readable error codes,
HTTP status mappings, and structured diagnostic payloads.
"""

from typing import Optional, Dict, Any


class AppException(Exception):
    """Base application exception for all domain-specific errors."""

    def __init__(
        self,
        message_en: str,
        message_ar: Optional[str] = None,
        error_code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message_en)
        self.message_en = message_en
        self.message_ar = message_ar or message_en
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Serializes the exception to a standardized API response dictionary."""
        return {
            "success": False,
            "error": {
                "code": self.error_code,
                "message": self.message_en,
                "message_ar": self.message_ar,
                "status_code": self.status_code,
                "details": self.details
            }
        }


# ----------------------------------------------------------------------
# Specific Domain Exceptions
# ----------------------------------------------------------------------
class ValidationException(AppException):
    """Raised when client input data violates schema or business constraints."""

    def __init__(self, message_en: str, message_ar: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message_en=message_en,
            message_ar=message_ar or "بيانات الإدخال غير صالحة أو غير مكتملة.",
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details
        )


class AuthenticationException(AppException):
    """Raised when credentials are invalid or session token has expired."""

    def __init__(self, message_en: str = "Invalid credentials or session expired.", message_ar: Optional[str] = None):
        super().__init__(
            message_en=message_en,
            message_ar=message_ar or "بيانات الاعتماد غير صحيحة أو انتهت صلاحية الجلسة.",
            error_code="AUTHENTICATION_FAILED",
            status_code=401
        )


class AuthorizationException(AppException):
    """Raised when an authenticated user lacks sufficient permissions for a requested role/action."""

    def __init__(self, message_en: str = "Access forbidden for current user role.", message_ar: Optional[str] = None):
        super().__init__(
            message_en=message_en,
            message_ar=message_ar or "ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.",
            error_code="ACCESS_FORBIDDEN",
            status_code=403
        )


class NotFoundException(AppException):
    """Raised when a requested resource (permit, report, user, CAD file) does not exist."""

    def __init__(self, resource_name: str, resource_id: Any):
        super().__init__(
            message_en=f"{resource_name} with identifier '{resource_id}' was not found.",
            message_ar=f"لم يتم العثور على {resource_name} برقم '{resource_id}'.",
            error_code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={"resource": resource_name, "id": str(resource_id)}
        )


class CadParsingException(AppException):
    """Raised when CAD DWG/DXF decoding, entity parsing, or UTM transformation fails."""

    def __init__(self, message_en: str, message_ar: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message_en=message_en,
            message_ar=message_ar or "فشل في قراءة ومعالجة ملف الأوتوكاد (DWG/DXF).",
            error_code="CAD_PARSING_FAILED",
            status_code=422,
            details=details
        )


class SpatialAlignmentException(AppException):
    """Raised when Computer Vision / GIS spatial registration fails."""

    def __init__(self, message_en: str, message_ar: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message_en=message_en,
            message_ar=message_ar or "فشل في المطابقة المكانية للرسم الهندسي مع الخريطة الجوية.",
            error_code="SPATIAL_ALIGNMENT_FAILED",
            status_code=422,
            details=details
        )


class GeoTiffProcessingException(AppException):
    """Raised when GeoTIFF raster parsing, metadata extraction, or CRS reprojection fails."""

    def __init__(self, message_en: str, message_ar: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message_en=message_en,
            message_ar=message_ar or "فشل في معالجة واستخراج إحداثيات صورة GeoTIFF.",
            error_code="GEOTIFF_PROCESSING_FAILED",
            status_code=422,
            details=details
        )


class ExternalServiceException(AppException):
    """Raised when an external API (Gemini LLM, MapLibre, external GIS) fails or rate-limits."""

    def __init__(self, service_name: str, message_en: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message_en=f"External service '{service_name}' failed: {message_en}",
            message_ar=f"تعذر الاتصال بالخدمة الخارجية '{service_name}'.",
            error_code="EXTERNAL_SERVICE_UNAVAILABLE",
            status_code=502,
            details={"service": service_name, **(details or {})}
        )


class DatabaseException(AppException):
    """Raised when database query execution or migration fails."""

    def __init__(self, message_en: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message_en=message_en,
            message_ar="حدث خطأ في قاعدة البيانات أثناء معالجة الطلب.",
            error_code="DATABASE_ERROR",
            status_code=500,
            details=details
        )
