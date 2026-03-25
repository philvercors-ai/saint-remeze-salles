from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="category",
            field=models.CharField(
                choices=[("salle", "Salle"), ("lieu", "Lieu")],
                default="salle",
                max_length=10,
                verbose_name="Catégorie",
            ),
        ),
    ]
