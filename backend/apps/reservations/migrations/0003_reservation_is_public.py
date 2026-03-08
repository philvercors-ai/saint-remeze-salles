from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("reservations", "0002_reservation_recurrence_group")]

    operations = [
        migrations.AddField(
            model_name="reservation",
            name="is_public",
            field=models.BooleanField(default=True, verbose_name="Réservation publique"),
        ),
    ]
