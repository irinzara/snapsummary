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
            'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
            'video/webm', 'video/x-matroska',
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
            'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac',
            'audio/webm',
        ]

        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Unsupported file type: {value.content_type}. Upload a video or audio file."
            )

        return value
