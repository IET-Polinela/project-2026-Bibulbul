from rest_framework import permissions

class IsOwnerAndDraftOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.reporter == request.user and obj.status == 'DRAFT'


class IsCitizenOnly(permissions.BasePermission):
    """Hanya Citizen/Member yang boleh Create"""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_member
            and not request.user.is_admin
        )


class IsAdminStatusOnly(permissions.BasePermission):
    """Admin hanya boleh update field status saja"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_admin:
            allowed_fields = {'status'}
            incoming_fields = set(request.data.keys())
            return incoming_fields.issubset(allowed_fields)
        return False
