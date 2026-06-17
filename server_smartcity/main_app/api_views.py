from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, permissions
from rest_framework.pagination import PageNumberPagination
from .models import Report
from .serializers import ReportSerializer
from .permissions import IsOwnerAndDraftOrReadOnly, IsCitizenOnly, IsAdminStatusOnly

# Aktifkan Pagination
class ReportPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    pagination_class = ReportPagination

    @extend_schema(exclude=True)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user

        # Sorting berdasarkan update terbaru
        queryset = Report.objects.all().order_by('-updated_at')

        # Server-side filtering berdasarkan parameter ?tab=
        tab = self.request.query_params.get('tab', None)

        if tab == 'my_reports':
            # Hanya laporan milik user yang login
            queryset = queryset.filter(reporter=user)

        elif tab == 'feed':
            # Laporan dari warga lain yang bukan DRAFT
            queryset = queryset.filter(
                ~Q(reporter=user) & ~Q(status='DRAFT')
            )

        else:
            # Default (sama seperti sebelumnya)
            queryset = queryset.filter(
                ~Q(status='DRAFT') | Q(status='DRAFT', reporter=user)
            )

        return queryset

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsCitizenOnly()]
        if self.action in ['update', 'partial_update']:
            if self.request.user.is_authenticated and self.request.user.is_admin:
                return [permissions.IsAuthenticated(), IsAdminStatusOnly()]
            return [permissions.IsAuthenticated(), IsOwnerAndDraftOrReadOnly()]
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsOwnerAndDraftOrReadOnly()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)
