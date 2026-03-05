from django.urls import path
from .views import MunicipalServiceListView, SendNotificationView, NotificationHistoryView

urlpatterns = [
    path("services/", MunicipalServiceListView.as_view(), name="municipal-services"),
    path("send/", SendNotificationView.as_view(), name="send-notification"),
    path("history/", NotificationHistoryView.as_view(), name="notification-history"),
]
