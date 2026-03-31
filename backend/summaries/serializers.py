from rest_framework import serializers
from .models import Summary


class SummarySerializer(serializers.ModelSerializer):
    file_size_mb = serializers.ReadOnlyField()

    class Meta:
        model = Summary
        fields = [
            'id', 'original_filename', 'file_size', 'file_size_mb',
            'file_type', 'status', 'error_message',
            'transcript', 'summary', 'language',
            'duration_seconds', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'status', 'transcript', 'summary', 'language',
            'duration_seconds', 'error_message', 'created_at', 'updated_at',
        ]


class UploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File too large. Max size is 50MB. Your file is {round(value.size / (1024*1024), 1)}MB."
            )

        allowed_types = [
            # Video
            'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
            'video/webm', 'video/x-matroska',
            # Audio
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
            'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm',
            # Documents
            'application/pdf',
            'text/plain',
        ]

        # Some browsers send different MIME types, also check extension
        ext = value.name.rsplit('.', 1)[-1].lower() if '.' in value.name else ''
        allowed_extensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'pdf', 'txt']

        if value.content_type not in allowed_types and ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"Unsupported file type. Supported: video, audio, PDF, TXT."
            )

        return value
