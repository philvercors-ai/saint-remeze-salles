from django.urls import path
from .rgpd_views import MyDataView, MyDataCSVView, RequestDeletionView, ConsentsView, PrivacyPolicyView

urlpatterns = [
    path("my-data/", MyDataView.as_view(), name="rgpd-my-data"),
    path("my-data/csv/", MyDataCSVView.as_view(), name="rgpd-my-data-csv"),
    path("request-deletion/", RequestDeletionView.as_view(), name="rgpd-request-deletion"),
    path("consents/", ConsentsView.as_view(), name="rgpd-consents"),
    path("privacy-policy/", PrivacyPolicyView.as_view(), name="rgpd-privacy-policy"),
]
