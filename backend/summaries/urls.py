from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.UploadView.as_view(), name='upload'),
    path('summaries/<int:pk>/', views.SummaryDetailView.as_view(), name='summary-detail'),
    path('history/', views.HistoryView.as_view(), name='history'),
    path('stats/', views.StatsView.as_view(), name='stats'),
]
