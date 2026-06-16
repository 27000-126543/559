from rest_framework import permissions


class IsProjectLeader(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.is_leader(request.user)


class IsProjectMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.is_member(request.user)


class HasProjectAccess(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.has_access(request.user)


class IsProjectLeaderOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return request.user and request.user.is_authenticated and obj.is_leader(request.user)
