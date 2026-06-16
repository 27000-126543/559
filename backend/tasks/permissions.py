from rest_framework import permissions


class CanApproveTask(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.can_approve(request.user)


class CanEditTask(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.can_edit(request.user)


class CanDeleteTask(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.can_delete(request.user)


class IsTaskSubmitter(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.submitter == request.user


class HasTaskAccess(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_admin:
            return True
        return obj.project.has_access(request.user)
