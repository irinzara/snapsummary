from django.db import models


class Summary(models.Model):
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('done', 'Done'),
        ('error', 'Error'),
    ]

    # File info
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='uploads/')
    file_size = models.BigIntegerField(help_text='Size in bytes')
    file_type = models.CharField(max_length=20, help_text='audio or video')

    # Processing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    error_message = models.TextField(blank=True, null=True)

    # Results
    transcript = models.TextField(blank=True, null=True)
    summary = models.TextField(blank=True, null=True)
    language = models.CharField(max_length=50, blank=True, null=True)
    duration_seconds = models.FloatField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'summaries'

    def __str__(self):
        return f"{self.original_filename} ({self.status})"

    @property
    def file_size_mb(self):
        return round(self.file_size / (1024 * 1024), 2)
