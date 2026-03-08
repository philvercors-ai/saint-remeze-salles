from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("manifestations", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="manifestation",
            name="is_public",
            field=models.BooleanField(default=True, verbose_name="Manifestation publique"),
        ),
    ]
