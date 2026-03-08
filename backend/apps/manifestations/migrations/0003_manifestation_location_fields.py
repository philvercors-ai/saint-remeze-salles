from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("manifestations", "0002_manifestation_is_public")]

    operations = [
        migrations.AddField(
            model_name="manifestation",
            name="location_type",
            field=models.CharField(
                choices=[("room", "Salle communale"), ("exterior", "Lieu extérieur")],
                default="exterior",
                max_length=10,
                verbose_name="Type de lieu",
            ),
        ),
        migrations.AddField(
            model_name="manifestation",
            name="room",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="manifestations",
                to="rooms.room",
                verbose_name="Salle communale",
            ),
        ),
        migrations.AddField(
            model_name="manifestation",
            name="gps_lat",
            field=models.FloatField(blank=True, null=True, verbose_name="Latitude GPS"),
        ),
        migrations.AddField(
            model_name="manifestation",
            name="gps_lng",
            field=models.FloatField(blank=True, null=True, verbose_name="Longitude GPS"),
        ),
        migrations.AlterField(
            model_name="manifestation",
            name="location",
            field=models.CharField(blank=True, max_length=200, verbose_name="Lieu / Adresse"),
        ),
    ]
