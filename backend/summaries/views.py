import threading
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404

from .models import Summary
from .serializers import SummarySerializer, UploadSerializer
from .ai_service import process_file


class UploadView(APIView):
    """
    POST /api/upload/
    Accepts a video or audio file, saves it, triggers async processing.
    Returns the summary object immediately with status='processing'.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = UploadSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        file = serializer.validated_data['file']

        # Determine file type
        content_type = file.content_type or ''
        file_type = 'video' if content_type.startswith('video') else 'audio'

        # Create DB record
        summary = Summary.objects.create(
            original_filename=file.name,
            file=file,
            file_size=file.size,
            file_type=file_type,
            status='processing',
        )

        # Process in background thread (non-blocking)
        thread = threading.Thread(target=process_file, args=(summary,))
        thread.daemon = True
        thread.start()

        return Response(
            SummarySerializer(summary).data,
            status=status.HTTP_201_CREATED
        )


class SummaryDetailView(APIView):
    """
    GET /api/summaries/<id>/
    Poll this endpoint to check processing status.
    """
    def get(self, request, pk):
        summary = get_object_or_404(Summary, pk=pk)
        return Response(SummarySerializer(summary).data)

    def delete(self, request, pk):
        summary = get_object_or_404(Summary, pk=pk)
        # Delete the uploaded file too
        if summary.file:
            try:
                summary.file.delete(save=False)
            except Exception:
                pass
        summary.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class HistoryView(APIView):
    """
    GET /api/history/
    Returns all past summaries, newest first.
    """
    def get(self, request):
        summaries = Summary.objects.all()
        serializer = SummarySerializer(summaries, many=True)
        return Response({
            'count': summaries.count(),
            'results': serializer.data,
        })


class StatsView(APIView):
    """
    GET /api/stats/
    Dashboard stats.
    """
    def get(self, request):
        total = Summary.objects.count()
        done = Summary.objects.filter(status='done').count()
        processing = Summary.objects.filter(status='processing').count()
        errors = Summary.objects.filter(status='error').count()

        return Response({
            'total': total,
            'done': done,
            'processing': processing,
            'errors': errors,
        })
