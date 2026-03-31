import threading
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404

from .models import Summary
from .serializers import SummarySerializer, UploadSerializer
from .ai_service import process_file

DOCUMENT_TYPES = {'.pdf', '.txt'}

class UploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = UploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        file = serializer.validated_data['file']
        content_type = file.content_type or ''
        ext = Path(file.name).suffix.lower()

        if ext in DOCUMENT_TYPES:
            file_type = 'document'
        elif content_type.startswith('video'):
            file_type = 'video'
        else:
            file_type = 'audio'

        summary = Summary.objects.create(
            original_filename=file.name,
            file=file,
            file_size=file.size,
            file_type=file_type,
            status='processing',
        )

        thread = threading.Thread(target=process_file, args=(summary,))
        thread.daemon = True
        thread.start()

        return Response(SummarySerializer(summary).data, status=status.HTTP_201_CREATED)


class SummaryDetailView(APIView):
    def get(self, request, pk):
        summary = get_object_or_404(Summary, pk=pk)
        return Response(SummarySerializer(summary).data)

    def delete(self, request, pk):
        summary = get_object_or_404(Summary, pk=pk)
        if summary.file:
            try: summary.file.delete(save=False)
            except: pass
        summary.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class HistoryView(APIView):
    def get(self, request):
        summaries = Summary.objects.all()
        return Response({'count': summaries.count(), 'results': SummarySerializer(summaries, many=True).data})


class StatsView(APIView):
    def get(self, request):
        return Response({
            'total': Summary.objects.count(),
            'done': Summary.objects.filter(status='done').count(),
            'processing': Summary.objects.filter(status='processing').count(),
            'errors': Summary.objects.filter(status='error').count(),
        })
