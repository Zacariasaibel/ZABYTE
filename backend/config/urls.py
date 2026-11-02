from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "ZABYTE · Verwaltung"
admin.site.site_title = "ZABYTE"
admin.site.index_title = "Demokatalog verwalten"

urlpatterns = [path("admin/", admin.site.urls), path("api/", include("catalog.urls"))]
