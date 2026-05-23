from rest_framework import viewsets, permissions
from .models import Report
from .serializers import ReportSerializer
from .permissions import IsOwnerAndDraftOrReadOnly, IsCitizenOnly, IsAdminStatusOnly

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer

    def get_queryset(self):
        user = self.request.user

        if user.is_admin:
            # Admin lihat semua laporan KECUALI DRAFT
            return Report.objects.exclude(status='DRAFT')

        # Citizen lihat laporan miliknya sendiri + laporan dari Admin
        admin_reports = Report.objects.filter(
            reporter__is_admin=True
        ).exclude(status='DRAFT')
        own_reports = Report.objects.filter(reporter=user)

        return (admin_reports | own_reports).distinct()

    def get_permissions(self):
        if self.action == 'create':
            # Hanya Citizen yang boleh create
            return [permissions.IsAuthenticated(), IsCitizenOnly()]

        if self.action in ['update', 'partial_update']:
            if self.request.user.is_admin:
                # Admin hanya boleh ubah status
                return [permissions.IsAuthenticated(), IsAdminStatusOnly()]
            # Citizen hanya boleh edit miliknya sendiri + status DRAFT
            return [permissions.IsAuthenticated(), IsOwnerAndDraftOrReadOnly()]

        if self.action == 'destroy':
            # Hanya citizen pemilik laporan + status DRAFT yang boleh delete
            return [permissions.IsAuthenticated(), IsOwnerAndDraftOrReadOnly()]

        # List & Detail: semua yang login boleh akses
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)
